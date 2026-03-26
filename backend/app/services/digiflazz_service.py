"""Digiflazz API Service for handling game top-up transactions.

2026 Specs Implementation:
- Proxy support for static IP whitelisting
- Rate limiting: Pricelist (5min cache), Balance/Transaction (UNLIMITED)
- Response hardening with formatted fields and timestamps
- Customer validation (min 8 digits)
- Thread-safe caching

PURE PYTHON SERVICE - NO FASTAPI DEPENDENCIES
All methods are synchronous and use the requests library.
FastAPI route handlers must wrap these calls with asyncio.get_event_loop().run_in_executor()
"""

import hashlib
import os
import threading
import time
from datetime import datetime
from typing import Optional

import requests

from dotenv import load_dotenv
load_dotenv()


class DigiflazzService:
    """Service for Digiflazz API integration (2026 specs compliant)."""

    BASE_URL = "https://api.digiflazz.com/v1"
    TIMEOUT = 30
    PRICELIST_CACHE_TTL = 300  # 5 minutes in seconds

    def __init__(self):
        """Initialize Digiflazz service with credentials, proxy, and rate limiting."""
        self.username = os.getenv("DIGIFLAZZ_USERNAME", "")
        self.api_key = os.getenv("DIGIFLAZZ_API_KEY", "")

        if not self.username or not self.api_key:
            raise ValueError(
                "DIGIFLAZZ_USERNAME and DIGIFLAZZ_API_KEY must be set in environment"
            )

        # Configure proxy from environment variable
        proxy_url = os.getenv("PROXY_URL", "")
        self.proxies = {}
        if proxy_url:
            self.proxies = {
                "http": proxy_url,
                "https": proxy_url,
            }

        # Thread-safe caching for pricelist (5-minute TTL)
        self._cache_lock = threading.Lock()
        self._pricelist_cache = None
        self._pricelist_cache_time = 0
        
        # Cache for WDP cheapest public prices (10-minute TTL)
        self._wdp_cheapest_cache = None
        self._wdp_cheapest_cache_time = 0
        self.WDP_CHEAPEST_CACHE_TTL = 600  # 10 minutes in seconds

    def _format_currency(self, amount: str) -> str:
        """
        Format amount as Indonesian Rupiah (Rp format).

        Args:
            amount: Amount string (e.g., "50000000")

        Returns:
            Formatted string (e.g., "Rp 50.000.000")
        """
        try:
            # Remove non-numeric characters
            num = int(str(amount).replace(".", "").replace(",", ""))
            # Format with thousands separator
            return f"Rp {num:,}".replace(",", ".")
        except (ValueError, TypeError):
            return f"Rp {amount}"

    def _validate_customer_no(self, customer_no: str) -> bool:
        """
        Validate customer_no format (must be at least 8 digits).

        Args:
            customer_no: Customer number to validate

        Returns:
            True if valid, False otherwise
        """
        # Extract digits from customer_no (format: target_id|server_id)
        digits_only = "".join(c for c in customer_no if c.isdigit())
        return len(digits_only) >= 8

    def _generate_sign(self, ref_id: str) -> str:
        """
        Generate MD5 sign for Digiflazz API authentication.

        Formula: MD5(username + api_key + ref_id)

        Args:
            ref_id: Reference ID for transaction

        Returns:
            MD5 hash string
        """
        sign_string = f"{self.username}{self.api_key}{ref_id}"
        return hashlib.md5(sign_string.encode()).hexdigest()

    def cek_saldo(self) -> dict:
        """
        Check Digiflazz account balance (UNLIMITED - no rate limiting).

        API Endpoint: https://api.digiflazz.com/v1/cek-saldo
        Method: POST

        Returns:
            dict: Response with balance, formatted field, and timestamp

        Example response:
            {
                "saldo": "50000000",
                "saldo_formatted": "Rp 50.000.000",
                "timestamp": "2026-03-17T10:30:45",
                "status": "success"
            }

        Raises:
            Exception: If API is down or request times out
        """
        try:
            ref_id = "depo"
            sign = self._generate_sign(ref_id)

            payload = {
                "cmd": "deposit",
                "username": self.username,
                "sign": sign,
            }

            response = requests.post(
                f"{self.BASE_URL}/cek-saldo",
                json=payload,
                timeout=self.TIMEOUT,
                proxies=self.proxies,
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Add formatted saldo and timestamp
            if "saldo" in result:
                result["saldo_formatted"] = self._format_currency(result["saldo"])
            
            result["timestamp"] = datetime.now().isoformat()
            
            return result

        except requests.exceptions.Timeout as e:
            raise Exception(f"Digiflazz API timeout: {str(e)}")
        except requests.exceptions.HTTPError as e:
            raise Exception(f"Digiflazz API HTTP error: {str(e)}")
        except Exception as e:
            raise Exception(f"Digiflazz cek_saldo error: {str(e)}")

    def create_transaction(
        self,
        sku: str,
        target_id: str,
        server_id: str,
        ref_id: str,
    ) -> dict:
        """
        Create a new transaction on Digiflazz (UNLIMITED - no rate limiting).

        API Endpoint: https://api.digiflazz.com/v1/transaction
        Method: POST

        Args:
            sku: Product SKU code from Digiflazz (or use buyer_sku_code field)
            target_id: Target player ID (game account ID, min 4 digits)
            server_id: Game server identifier (min 4 digits)
            ref_id: Unique reference ID for this transaction (must be unique per transaction)

        Returns:
            dict: Response with transaction details and info field

        Example response:
            {
                "ref_id": "TOP-abc123",
                "status": "success",
                "amount": "50000",
                "info": "Transaction submitted successfully"
            }

        Raises:
            Exception: If validation fails or API is down

        Validation Rules:
            - customer_no (target_id|server_id) must have at least 8 total digits
        """
        try:
            # Validate customer_no format (target_id|server_id must be at least 8 digits)
            customer_no = f"{target_id}|{server_id}"
            if not self._validate_customer_no(customer_no):
                error_msg = "Gunakan buyer_sku_code atau sku field. Customer nomor harus minimal 8 digit."
                return {
                    "status": "error",
                    "info": error_msg,
                    "error": error_msg,
                }

            sign = self._generate_sign(ref_id)

            payload = {
                "username": self.username,
                "buyer_sku_code": sku,
                "customer_no": customer_no,
                "ref_id": ref_id,
                "sign": sign,
            }

            response = requests.post(
                f"{self.BASE_URL}/transaction",
                json=payload,
                timeout=self.TIMEOUT,
                proxies=self.proxies,
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Add informative info field
            if result.get("status") == "Sukses" or result.get("status") == "success":
                result["info"] = "Transaksi berhasil diproses"
            elif result.get("status") == "PENDING":
                result["info"] = "Transaksi sedang diproses, mohon tunggu"
            else:
                result["info"] = result.get("message", "Transaksi telah dikirim ke Digiflazz")
            
            return result

        except requests.exceptions.Timeout as e:
            error_msg = f"Request timeout: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }
        except Exception as e:
            error_msg = f"Transaction error: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }

    def cek_status(
        self,
        sku: str,
        target_id: str,
        server_id: str,
        ref_id: str,
    ) -> dict:
        """
        Check transaction status on Digiflazz (UNLIMITED - no rate limiting).

        API Endpoint: https://api.digiflazz.com/v1/transaction
        Method: POST (same as create_transaction)

        Note: Digiflazz uses the same endpoint for both creating and checking status.
        The API automatically detects based on the ref_id if it's a new or existing transaction.

        Args:
            sku: Product SKU code from Digiflazz
            target_id: Target player ID (game account ID)
            server_id: Game server identifier
            ref_id: Reference ID of the transaction to check

        Returns:
            dict: Response with transaction status and info field

        Raises:
            Exception: If API is down or request times out
        """
        try:
            # Validate customer_no format
            customer_no = f"{target_id}|{server_id}"
            if not self._validate_customer_no(customer_no):
                error_msg = "Invalid customer number format"
                return {
                    "status": "error",
                    "info": error_msg,
                    "error": error_msg,
                }

            sign = self._generate_sign(ref_id)

            payload = {
                "username": self.username,
                "buyer_sku_code": sku,
                "customer_no": customer_no,
                "ref_id": ref_id,
                "sign": sign,
            }

            response = requests.post(
                f"{self.BASE_URL}/transaction",
                json=payload,
                timeout=self.TIMEOUT,
                proxies=self.proxies,
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Add informative info field based on status
            status = str(result.get("status", "")).lower().strip()
            if status in ["sukses", "success"]:
                result["info"] = "Transaksi berhasil"
            elif status == "pending":
                result["info"] = "Transaksi sedang diproses"
            elif status in ["gagal", "failed"]:
                result["info"] = "Transaksi gagal"
            else:
                result["info"] = "Status tidak diketahui"
            
            return result

        except requests.exceptions.Timeout as e:
            error_msg = f"Check status timeout: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }
        except Exception as e:
            error_msg = f"Status check error: {str(e)}"
            return {
                "status": "error",
                "info": error_msg,
                "error": error_msg,
            }

    def get_product_list(self) -> dict:
        """
        Get list of available products from Digiflazz with 5-minute caching.

        API Endpoint: https://api.digiflazz.com/v1/product
        Method: POST

        Rate Limit: 5-minute cache (300 seconds) with thread-safe access

        Returns:
            dict: Response from Digiflazz API containing product list (from cache or fresh)

        Raises:
            Exception: If API is down or request times out
        """
        try:
            # Check cache with thread-safety
            with self._cache_lock:
                current_time = time.time()
                
                # Return cached pricelist if still valid (within 5 minutes)
                if (self._pricelist_cache is not None and 
                    current_time - self._pricelist_cache_time < self.PRICELIST_CACHE_TTL):
                    return {
                        **self._pricelist_cache,
                        "from_cache": True,
                        "cache_timestamp": self._pricelist_cache_time,
                    }
            
            # Cache expired or empty, fetch fresh data
            ref_id = "produk"
            sign = self._generate_sign(ref_id)

            payload = {
                "cmd": "list-produk",
                "username": self.username,
                "sign": sign,
            }

            response = requests.post(
                f"{self.BASE_URL}/product",
                json=payload,
                timeout=self.TIMEOUT,
                proxies=self.proxies,
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Update cache with thread-safety
            with self._cache_lock:
                self._pricelist_cache = result
                self._pricelist_cache_time = time.time()
            
            return {
                **result,
                "from_cache": False,
                "cache_timestamp": time.time(),
            }

        except requests.exceptions.Timeout as e:
            raise Exception(f"Digiflazz get_product_list timeout: {str(e)}")
        except requests.exceptions.HTTPError as e:
            raise Exception(f"Digiflazz get_product_list HTTP error: {str(e)}")
        except Exception as e:
            raise Exception(f"Digiflazz get_product_list error: {str(e)}")

    def get_wdp_cheapest_public(self) -> dict:
        """
        Get cheapest WDP (Weekly Diamond Pass) prices from public Digiflazz API.
        
        This method fetches public market prices for WDP Brazil and Turkey variants
        to help compare with internal cost prices. Uses 10-minute caching to prevent
        rate limiting and IP blocking.
        
        API Endpoint: GET https://digiflazz.com/api/v1/product?search=weekly%20diamond%20pass
        Method: GET (public endpoint, no authentication)
        
        Rate Limit: 10-minute cache (600 seconds) with thread-safe access
        
        Returns:
            dict: Contains:
                - brazil (int|null): Cheapest price for Brazil WDP
                - turkey (int|null): Cheapest price for Turkey WDP
                - min (int|null): Overall minimum between both
                - cached (bool): Whether data came from cache
                - cache_age (int): Cache age in seconds
                
        Example response:
            {
                "brazil": 23500,
                "turkey": 25000,
                "min": 23500,
                "cached": True,
                "cache_age": 45
            }
        """
        try:
            # Check cache with thread-safety
            with self._cache_lock:
                current_time = time.time()
                
                # Return cached data if still valid (within 10 minutes)
                if (self._wdp_cheapest_cache is not None and 
                    current_time - self._wdp_cheapest_cache_time < self.WDP_CHEAPEST_CACHE_TTL):
                    cache_age = int(current_time - self._wdp_cheapest_cache_time)
                    return {
                        **self._wdp_cheapest_cache,
                        "cached": True,
                        "cache_age": cache_age,
                    }
            
            # Cache expired or empty, fetch fresh data from public API
            api_url = "https://digiflazz.com/api/v1/product"
            params = {"search": "weekly diamond pass"}
            
            response = requests.get(
                api_url,
                params=params,
                timeout=self.TIMEOUT,
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Initialize result
            result = {
                "brazil": None,
                "turkey": None,
                "min": None,
            }
            
            # Parse products list - looking for WDP items with type Brazil and Turkey
            if isinstance(data, dict) and "data" in data:
                products = data.get("data", [])
            elif isinstance(data, list):
                products = data
            else:
                products = []
            
            # Extract lowest prices for each type
            brazil_prices = []
            turkey_prices = []
            
            for product in products:
                if not isinstance(product, dict):
                    continue
                
                product_type = str(product.get("type", "")).lower().strip()
                lowest_price_str = product.get("lowest_price", product.get("price", ""))
                
                try:
                    # Parse price - handle both string and int
                    if isinstance(lowest_price_str, str):
                        lowest_price = int(lowest_price_str.replace(".", "").replace(",", ""))
                    else:
                        lowest_price = int(lowest_price_str)
                    
                    if lowest_price > 0:  # Only consider positive prices
                        if "brazil" in product_type or "br" in product_type:
                            brazil_prices.append(lowest_price)
                        elif "turkey" in product_type or "tr" in product_type:
                            turkey_prices.append(lowest_price)
                except (ValueError, AttributeError):
                    # Skip items with invalid price format
                    continue
            
            # Get minimum price for each region
            if brazil_prices:
                result["brazil"] = min(brazil_prices)
            if turkey_prices:
                result["turkey"] = min(turkey_prices)
            
            # Calculate overall minimum
            valid_prices = [p for p in [result["brazil"], result["turkey"]] if p is not None]
            if valid_prices:
                result["min"] = min(valid_prices)
            
            # Update cache with thread-safety
            with self._cache_lock:
                self._wdp_cheapest_cache = result
                self._wdp_cheapest_cache_time = time.time()
            
            return {
                **result,
                "cached": False,
                "cache_age": 0,
            }
        
        except requests.exceptions.Timeout as e:
            return {
                "brazil": None,
                "turkey": None,
                "min": None,
                "error": f"Timeout fetching WDP prices: {str(e)}",
                "cached": False,
                "cache_age": 0,
            }
        except requests.exceptions.RequestException as e:
            return {
                "brazil": None,
                "turkey": None,
                "min": None,
                "error": f"Request failed: {str(e)}",
                "cached": False,
                "cache_age": 0,
            }
        except Exception as e:
            return {
                "brazil": None,
                "turkey": None,
                "min": None,
                "error": f"Error parsing WDP prices: {str(e)}",
                "cached": False,
                "cache_age": 0,
            }
