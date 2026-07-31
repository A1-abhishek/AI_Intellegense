import json
import logging
import re

logger = logging.getLogger("docmind.entity_extractor")

EXTRACTION_PROMPT = """You are an intelligence analyst. Extract ALL key entities from this document.
Return ONLY a JSON object with these fields (use empty string "" or empty list [] if info not found):

{
  "persons": ["full names of all people mentioned"],
  "organizations": ["company, agency, institution names"],
  "locations": ["addresses, cities, countries, places"],
  "phone_numbers": ["all phone numbers found"],
  "emails": ["all email addresses found"],
  "dates": ["all dates mentioned (keep original format)"],
  "monetary_values": ["amounts, prices, salaries, budgets"],
  "id_numbers": ["SSN, passport, ID, account numbers, reference numbers"],
  "job_titles": ["roles, titles, positions mentioned"],
  "websites": ["URLs and web addresses"],
  "key_facts": ["important facts, decisions, agreements, deadlines"],
  "summary": "one-sentence intelligence summary of this document",
  "document_type": "classify as: contract, invoice, correspondence, report, legal, medical, financial, resume, form, other",
  "risk_flags": ["any suspicious, unusual, or noteworthy items requiring attention"],
  "sentiment": "positive|negative|neutral",
  "urgency": "high|medium|low|none"
}

Rules:
- Extract EXACTLY what appears in the text. Do not infer or fabricate.
- If a field has no data, use "" for strings or [] for lists.
- Include ALL instances (multiple phones, multiple people, etc.)
- For monetary values, include the currency symbol.
- For dates, preserve the original format from the document."""


def extract_entities_with_llm(content: str, llm_client=None, model: str = None) -> dict:
    """Use Groq LLM to extract structured entities from document content."""
    logger.info(f"Extracting entities from {len(content)} chars")

    text = content[:15000]

    try:
        from config import llm_chat
        raw = llm_chat([
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": text},
        ], max_tokens=2000, temperature=0.1)
        raw = raw.strip()
        raw = re.sub(r"^```\w*\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        entities = json.loads(raw)
        logger.info(f"LLM extracted {len(entities)} entity fields")
        return _normalize_entities(entities)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON: {e}")
        return _default_entities()
    except Exception as e:
        logger.error(f"Entity extraction LLM call failed: {e}", exc_info=True)
        return _default_entities()


def extract_entities_regex(content: str) -> dict:
    """Fallback regex-based extraction when LLM is unavailable."""
    logger.info("Using regex-based entity extraction")
    entities = _default_entities()

    email_pattern = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    entities["emails"] = list(set(re.findall(email_pattern, content)))

    phone_patterns = [
        r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}',
        r'\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b',
        r'\b\d{10,12}\b',
    ]
    phones = set()
    for pat in phone_patterns:
        for match in re.findall(pat, content):
            cleaned = re.sub(r'[^\d+\-() ]', '', match).strip()
            if 7 <= len(re.sub(r'\D', '', cleaned)) <= 15:
                phones.add(cleaned)
    entities["phone_numbers"] = list(phones)

    date_patterns = [
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b',
        r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
    ]
    dates = set()
    for pat in date_patterns:
        dates.update(re.findall(pat, content, re.IGNORECASE))
    entities["dates"] = list(dates)

    money_pattern = r'[\$\u20ac\u00a3]\s*[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|INR)\b'
    entities["monetary_values"] = list(set(re.findall(money_pattern, content)))

    url_pattern = r'https?://[^\s<>"\']+|www\.[^\s<>"\']+'
    entities["websites"] = list(set(re.findall(url_pattern, content)))

    entities["document_type"] = _guess_doc_type(content)

    return entities


def _normalize_entities(entities: dict) -> dict:
    """Ensure all expected fields exist with proper types."""
    defaults = _default_entities()
    result = {}
    for key, default_val in defaults.items():
        val = entities.get(key, default_val)
        if isinstance(default_val, list):
            if isinstance(val, list):
                result[key] = [str(v) for v in val if v]
            elif isinstance(val, str) and val:
                result[key] = [val]
            else:
                result[key] = []
        else:
            result[key] = str(val) if val else default_val
    return result


def _default_entities() -> dict:
    return {
        "persons": [],
        "organizations": [],
        "locations": [],
        "phone_numbers": [],
        "emails": [],
        "dates": [],
        "monetary_values": [],
        "id_numbers": [],
        "job_titles": [],
        "websites": [],
        "key_facts": [],
        "summary": "",
        "document_type": "other",
        "risk_flags": [],
        "sentiment": "neutral",
        "urgency": "none",
    }


def _guess_doc_type(content: str) -> str:
    lower = content.lower()
    if any(w in lower for w in ["invoice", "bill", "amount due", "total:", "payment"]):
        return "invoice"
    if any(w in lower for w in ["contract", "agreement", "terms and conditions", "party a", "party b"]):
        return "contract"
    if any(w in lower for w in ["resume", "curriculum vitae", "education:", "experience:", "skills:"]):
        return "resume"
    if any(w in lower for w in ["dear", "sincerely", "regards", "to whom"]):
        return "correspondence"
    if any(w in lower for w in ["report", "findings", "analysis", "conclusion"]):
        return "report"
    if any(w in lower for w in ["patient", "diagnosis", "prescription", "medical"]):
        return "medical"
    if any(w in lower for w in ["balance sheet", "profit", "loss", "revenue", "financial"]):
        return "financial"
    return "other"
