---
title: "contains"
canonical: https://tenzir.com/docs/reference/functions/contains
source: https://tenzir.com/docs/reference/functions/contains.md
section: "Docs"
---

# contains

> The contains function is a deprecated alias for search. It still works, but emits a deprecation warning. Replace contains(input, target) with search(input, target), or input.contains(target) with input.search(target). The exact and ignorecase options are unchanged.

The `contains` function is a deprecated alias for [`search`](https://tenzir.com/docs/reference/functions/search.md). It still works, but emits a deprecation warning. Replace `contains(input, target)` with `search(input, target)`, or `input.contains(target)` with `input.search(target)`. The `exact` and `ignore_case` options are unchanged.

```tql
from {user: {name: "Alice"}}
found = search(user, "alice", ignore_case=true)
```
