# Continue

Finish the merge go/no-go now. If you already emitted the json array, emit
it again verbatim. Otherwise check cluster state once, then return one
object per candidate: {"iid", "action": "merge|skip", "reason"} in a single
fenced json block. No prose outside the block.
