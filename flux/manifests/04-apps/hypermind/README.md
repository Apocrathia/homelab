# Hypermind

[← Apps](../README.md)

> _"Hey everyone, so you just finished setting up the \*Arr stack and your dashboards lookin crisp. But you look at your htop and see… unused RAM. It's disgusting, isn't it?"_

## Overview

[Hypermind](https://github.com/lklynet/hypermind) is **The High-Availability Solution to a Problem That Doesn't Exist™**.

It solves the critical infrastructure challenge of knowing exactly how many other people are currently wasting RAM running this specific container, while providing a secure, serverless way to say "hello" to them.

There is no central server. There is no database. There is only **The Swarm**.

## FAQ

**Q: Is this crypto mining?**
A: No. We respect your GPU too much.

**Q: Does this store data?**
A: No. It has the short-term working memory of a honeybee (approx. 45 seconds).

**Q: Why did you make this?**
A: The homelab must grow. ¯\\_(ツ)_/¯

## Features

- **Active Nodes**: Real-time count of currently online peers
- **Total Unique**: Probabilistic estimate of all unique nodes encountered (HyperLogLog)
- **Ephemeral Chat**: Decentralized P2P chat with the memory of a goldfish
- **Visualizations**: Particle map and theme switcher

## Access

- **URL**: https://hypermind.gateway.services.apocrathia.com
- **Auth**: Authentik SSO (proxy mode)

## References

- [GitHub Repository](https://github.com/lklynet/hypermind)
- [Reddit Announcement](https://www.reddit.com/r/selfhosted/comments/1q20yew/introducing_hypermind_a_fully_decentralized_p2p/)
- [Lemmy Discussion](https://lemmy.ml/post/41166894)

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n hypermind

# View logs
kubectl logs -n hypermind -l app=hypermind

# Check swarm stats
kubectl exec -n hypermind deploy/hypermind -- wget -qO- http://localhost:3000/api/stats
```
