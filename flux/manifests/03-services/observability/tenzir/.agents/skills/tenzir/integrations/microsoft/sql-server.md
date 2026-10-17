---
title: "Microsoft SQL Server integration"
description: "Provides audit logs for database activity, logins, and errors."
canonical: https://tenzir.com/integrations/microsoft/sql-server
source: https://tenzir.com/integrations/microsoft/sql-server.md
section: "Integrations"
---

# Microsoft SQL Server integration

> Provides audit logs for database activity, logins, and errors.

[Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server) is a relational database management system. Tenzir can read events from SQL Server and Azure SQL Database.

Microsoft SQL Server

Use [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md) to connect to SQL Server-compatible databases over the Tabular Data Stream (TDS) protocol. The operator can read a table, execute a custom SQL query, list table metadata, or poll a table for newly inserted rows.

Tenzir connects to SQL Server over the network via the host and port you specify in the operator. This means:

* **Network**: Tenzir and SQL Server can run on the same machine or on different machines in the same network.
* **IPC**: There is no direct inter-process communication (IPC) mechanism; all communication uses TDS.
* **Co-deployment**: For best performance and security, deploy Tenzir and SQL Server in the same trusted network or use TLS for encrypted connections.

## Examples

These examples assume that Tenzir can reach SQL Server on the network and that the database user has read access to the target database.

### List available tables

```tql
from_microsoft_sql show="tables",
                   host="sql.example.com",
                   user="tenzir_reader",
                   password=secret("sql-server-password"),
                   database="security",
                   tls=true
```

### Read from a table

```tql
from_microsoft_sql table="dbo.events",
                   host="sql.example.com",
                   user="tenzir_reader",
                   password=secret("sql-server-password"),
                   database="security",
                   tls=true
```

### Execute a custom SQL query

```tql
from_microsoft_sql query=r"SELECT id, created_at, source, message
                          FROM dbo.events
                          WHERE severity >= 3",
                   host="sql.example.com",
                   user="tenzir_reader",
                   password=secret("sql-server-password"),
                   database="security",
                   tls=true
```

### Stream new rows

```tql
from_microsoft_sql table="dbo.events",
                   live=true,
                   tracking_column="id",
                   host="sql.example.com",
                   user="tenzir_reader",
                   password=secret("sql-server-password"),
                   database="security",
                   tls=true
```

### Connect to Azure SQL

Azure SQL Database accepts TDS connections on port `1433` and requires TLS. Use the server host name from Azure, usually in the form `<server>.database.windows.net`, and set `tls=true`.

```tql
from_microsoft_sql query="SELECT TOP 10 * FROM dbo.events",
                   host="example.database.windows.net",
                   port=1433,
                   user="tenzir_reader",
                   password=secret("azure-sql-password"),
                   database="security",
                   tls=true
```

The operator currently supports SQL authentication. Microsoft Entra authentication, managed identities, Windows authentication, and Kerberos are not supported.

## See Also

* [`from_microsoft_sql`](https://tenzir.com/docs/reference/operators/from_microsoft_sql.md)
