from guardrails import Guard
from guardrails.hub import RegexMatch, GibberishText, SecretsPresent, ToxicLanguage

# Simple regex validator example - matches the official guardrails-lite-server
name_case = Guard(
    name='name-case',
    description='Checks that a string is in Title Case format.'
).use(
    RegexMatch(regex="^(?:[A-Z][^\\s]*\\s?)+$")
)

# Gibberish text detection using Hugging Face models
gibberish_guard = Guard(
    name='gibberish-guard',
    description='Detects if text is gibberish using AI models.'
).use(
    GibberishText(on_fail='exception')
)

# Security validator - detects potential secrets in text
secrets_guard = Guard(
    name='secrets-guard',
    description='Detects potential secrets like API keys, passwords, etc.'
).use(
    SecretsPresent(on_fail='exception')
)

# Content moderation - detects toxic/harmful language
toxic_guard = Guard(
    name='toxic-guard',
    description='Detects toxic, harmful, or inappropriate language.'
).use(
    ToxicLanguage(on_fail='exception')
)

# Export guards for the server to use
__all__ = [
    'name_case',
    'gibberish_guard',
    'secrets_guard',
    'toxic_guard'
]
