import os
import asyncio
from google import genai
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MultiKeyManager:
    """
    Manages multiple Google API keys with round-robin distribution, 
    failover mechanisms, and background health checks for failed keys.
    """
    def __init__(self, env_var_prefix="GOOGLE_API_KEY"):
        self.keys = []
        # Support both GOOGLE_API_KEY_1, GOOGLE_API_KEY_2... and comma separated GOOGLE_API_KEYS
        
        # 1. Check for single key first for backward compatibility
        single_key = os.getenv(env_var_prefix)
        if single_key:
            self.keys.append(single_key)
            
        # 2. Check for comma separated list
        multi_keys = os.getenv(f"{env_var_prefix}S")
        if multi_keys:
            self.keys.extend([k.strip() for k in multi_keys.split(",") if k.strip()])
            
        # 3. Check for numbered keys
        i = 1
        while True:
            key = os.getenv(f"{env_var_prefix}_{i}")
            if not key:
                break
            self.keys.append(key)
            i += 1
            
        # Remove duplicates while preserving order
        self.keys = list(dict.fromkeys(self.keys))
        
        self.clients = [genai.Client(api_key=k) for k in self.keys]
        self.current_idx = 0
        self.failed_keys = set() # Indices of failed keys
        self.lock = asyncio.Lock()
        
        logger.info(f"Initialized MultiKeyManager with {len(self.keys)} keys.")

    def has_keys(self):
        return len(self.keys) > 0

    async def get_client(self):
        async with self.lock:
            if not self.clients:
                return None
                
            # Basic round-robin, skipping known failed ones
            start_idx = self.current_idx
            while True:
                client = self.clients[self.current_idx]
                idx = self.current_idx
                self.current_idx = (self.current_idx + 1) % len(self.clients)
                
                if idx not in self.failed_keys:
                    return client, idx
                
                if self.current_idx == start_idx:
                    # All keys failed? Try the current one anyway or return None
                    logger.warning("All API keys marked as failed. Retrying first one.")
                    return self.clients[0], 0

    async def call_with_failover(self, func, *args, **kwargs):
        """
        Executes a Google GenAI client function with round-robin failover.
        Distinguishes between transient rate-limits and permanent auth failures.
        """
        tried_indices = set()
        last_error = None
        
        while len(tried_indices) < len(self.clients):
            res = await self.get_client()
            if not res:
                raise Exception("No functional API keys currently available.")
            
            client, idx = res
            tried_indices.add(idx)
            
            try:
                return await asyncio.to_thread(func, client, *args, **kwargs)
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                
                # Check for specific failure types
                is_rate_limit = "429" in err_msg or "quota" in err_msg
                is_auth_error = "401" in err_msg or "403" in err_msg or "invalid" in err_msg
                
                if is_auth_error:
                    logger.critical(f"API Key {idx} is INVALID (Auth Error). Disabling permanently.")
                    self.failed_keys.add(idx)
                    # Don't probe invalid keys
                elif is_rate_limit:
                    logger.warning(f"API Key {idx} rate limited (429). Cooling down...")
                    self.failed_keys.add(idx)
                    asyncio.create_task(self._probe_failed_key(idx, initial_delay=60))
                else:
                    logger.error(f"API Key {idx} unexpected error: {e}")
                    self.failed_keys.add(idx)
                    asyncio.create_task(self._probe_failed_key(idx, initial_delay=30))

                if len(tried_indices) == len(self.clients):
                    logger.error("All available API keys exhausted or failed.")
                    raise last_error
                
                logger.info(f"Failover: attempting next key after error on key {idx}...")

    async def _probe_failed_key(self, idx, initial_delay=30):
        """Background task to periodically check if a failed key is working again."""
        delay = initial_delay
        client = self.clients[idx]
        
        # Max retries to probe
        for _ in range(5):
            await asyncio.sleep(delay)
            logger.info(f"Probing API Key {idx}...")
            
            try:
                # Simple probe call
                await asyncio.to_thread(
                    client.models.generate_content, 
                    model='gemini-3.1-flash-lite-preview', 
                    contents="hi"
                )
                # Success!
                async with self.lock:
                    if idx in self.failed_keys:
                        self.failed_keys.remove(idx)
                        logger.info(f"API Key {idx} probe successful. Re-enabled.")
                return
            except Exception:
                logger.warning(f"API Key {idx} probe failed. Retrying in {delay*2}s.")
                delay *= 2
        
        # If still failing after retries, keep it failed for a longer time or just let it be
        logger.error(f"API Key {idx} failed probe 5 times. Leaving disabled.")

# Singleton instance
api_manager = MultiKeyManager()
