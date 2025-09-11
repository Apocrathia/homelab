from guardrails import Guard
from guardrails.hub import GibberishText, ValidLength, TwoWords, RegexMatch, SecretsPresent, ToxicLanguage

# Create guards using Hub validators
# These leverage community-proven validators from the Guardrails Hub

detect_secrets_guard = Guard(name='detect-secrets-guard').use(
    SecretsPresent(on_fail='exception')
)

gibberish_guard = Guard(name='gibberish-guard').use(
    GibberishText(on_fail='exception')
)

toxic_language_guard = Guard(name='toxic-language-guard').use(
    ToxicLanguage(on_fail='exception')
)

length_guard = Guard(name='length-guard').use(
    ValidLength(min=1, max=1000, on_fail='exception')
)

two_words_guard = Guard(name='two-words-guard').use(
    TwoWords(on_fail='exception')
)

email_guard = Guard(name='email-guard').use(
    RegexMatch(
        regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        on_fail='exception'
    )
)

# Export guards for the server to use
__all__ = [
    'detect_secrets_guard',
    'gibberish_guard',
    'toxic_language_guard',
    'length_guard',
    'two_words_guard',
    'email_guard'
]
