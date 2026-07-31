import logging
import sys

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(
    level=logging.DEBUG,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("docmind.log", mode="a", encoding="utf-8"),
    ],
)

for noisy in ["urllib3", "httpx", "httpcore", "chromadb", "sentence_transformers", "transformers"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

logger = logging.getLogger("docmind")
