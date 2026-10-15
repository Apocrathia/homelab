# tetragon OCSF map

[`map.tql`](./map.tql) dispatches export events to the class operators
in [`events/`](./events/README.md): Process Activity (1007) for exec and
exit, File System Activity (1001) and Network Activity (4001) for kprobe
policies, Base Event for the rest. The unmapped residue is a selected
projection (pod identity, policy name), not the raw record.
