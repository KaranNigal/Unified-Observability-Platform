import re

METRIC_SELECTOR_PATTERN = re.compile(r'([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?')

RESERVED_WORDS = {
    "sum", "rate", "irate", "increase", "avg", "min", "max", "count",
    "by", "without", "histogram_quantile", "topk", "bottomk", "stddev",
    "stdvar", "count_values", "quantile", "abs", "absent", "ceil", "floor",
    "round", "clamp", "clamp_max", "clamp_min", "exp", "ln", "log2", "log10",
    "sqrt", "predict_linear", "resets", "changes", "deriv", "delta", "idelta"
}

def inject_tenant_promql(query: str, tenant_id: str) -> str:
    """
    Securely injects tenant_id="<tenant_id>" into all vector selectors in a PromQL query.
    Guarantees client requests are strictly scoped to their tenant.
    """
    if not tenant_id:
        return query

    tenant_filter = f'tenant_id="{tenant_id}"'

    def replacer(match):
        metric_name = match.group(1)
        braces = match.group(2)

        # Skip reserved PromQL functions/keywords
        if metric_name.lower() in RESERVED_WORDS:
            return match.group(0)

        # If it already has label filters inside { ... }
        if braces:
            inner = braces[1:-1].strip()
            # If tenant_id already exists in label matchers, replace it
            if "tenant_id=" in inner:
                inner = re.sub(r'tenant_id="[^"]*"', tenant_filter, inner)
                return f"{metric_name}{{{inner}}}"
            elif inner:
                return f"{metric_name}{{{inner},{tenant_filter}}}"
            else:
                return f"{metric_name}{{{tenant_filter}}}"
        else:
            return f"{metric_name}{{{tenant_filter}}}"

    return METRIC_SELECTOR_PATTERN.sub(replacer, query)
