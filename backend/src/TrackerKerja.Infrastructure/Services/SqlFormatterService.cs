using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Infrastructure.Services;

public class SqlFormatterService : ISqlFormatterService
{
    private static readonly HashSet<string> MajorClauses = new(StringComparer.OrdinalIgnoreCase)
    {
        "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
        "LIMIT", "OFFSET", "FETCH FIRST", "UNION ALL", "UNION", "EXCEPT", "INTERSECT",
        "WITH", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM",
        "CREATE TABLE", "ALTER TABLE", "DROP TABLE", "TRUNCATE TABLE",
        "MERGE INTO", "MERGE"
    };

    private static readonly HashSet<string> MinorClauses = new(StringComparer.OrdinalIgnoreCase)
    {
        "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "FULL OUTER JOIN",
        "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "FULL JOIN", "JOIN",
        "ON", "AND", "OR", "CASE", "WHEN", "THEN", "ELSE", "END",
        "OVER", "PARTITION BY", "RETURNING"
    };

    private static readonly HashSet<string> AllKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "SELECT", "DISTINCT", "ALL", "TOP", "AS", "FROM", "WHERE", "GROUP", "BY", "HAVING",
        "ORDER", "ASC", "DESC", "LIMIT", "OFFSET", "FETCH", "FIRST", "ROWS", "ONLY",
        "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "NATURAL", "ON",
        "AND", "OR", "NOT", "IN", "IS", "NULL", "LIKE", "ILIKE", "BETWEEN", "EXISTS",
        "UNION", "EXCEPT", "INTERSECT", "WITH", "RECURSIVE",
        "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
        "CREATE", "TABLE", "VIEW", "INDEX", "ALTER", "DROP", "TRUNCATE",
        "CASE", "WHEN", "THEN", "ELSE", "END",
        "OVER", "PARTITION", "ROW_NUMBER", "RANK", "DENSE_RANK", "COUNT", "SUM", "AVG", "MIN", "MAX",
        "COALESCE", "NULLIF", "CAST", "CONVERT", "RETURNING", "DUAL", "ROWNUM",
        "PRAGMA", "QUALIFY", "UNNEST", "STRUCT", "FLATTEN", "CLUSTER", "LATERAL"
    };

    public SqlFormatResult Format(SqlFormatRequest request)
    {
        var sw = Stopwatch.StartNew();
        var raw = request.Sql ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new SqlFormatResult(true, string.Empty, request.Dialect ?? "postgresql", 0, 0, 0);
        }

        var indent = request.IndentSpaces > 0 ? new string(' ', request.IndentSpaces) : "\t";
        var tokens = Tokenize(raw);

        var sb = new StringBuilder();
        int currentLevel = 0;
        bool isAtLineStart = true;
        string? currentMajorClause = null;

        for (int i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];

            if (token.Type == TokenType.Comment)
            {
                if (!isAtLineStart) sb.AppendLine();
                sb.Append(token.Value.Trim());
                sb.AppendLine();
                isAtLineStart = true;
                continue;
            }

            if (token.Type == TokenType.Whitespace)
            {
                continue;
            }

            // Check for multi-word major clause (GROUP BY, ORDER BY, INSERT INTO, DELETE FROM, UNION ALL, FETCH FIRST)
            string matchedMajor = MatchMultiWordClause(tokens, i, MajorClauses);
            if (!string.IsNullOrEmpty(matchedMajor))
            {
                if (!isAtLineStart) sb.AppendLine();
                currentLevel = 0;
                currentMajorClause = matchedMajor.ToUpperInvariant();

                sb.Append(ApplyCasing(matchedMajor, request.Casing));
                sb.AppendLine();
                currentLevel = 1;
                isAtLineStart = true;

                // Advance tokens for multi-word clause
                int wordsInClause = matchedMajor.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                i += (wordsInClause - 1);
                continue;
            }

            // Check for multi-word minor clause (LEFT JOIN, INNER JOIN, etc.)
            string matchedMinor = MatchMultiWordClause(tokens, i, MinorClauses);
            if (!string.IsNullOrEmpty(matchedMinor))
            {
                if (!isAtLineStart) sb.AppendLine();
                sb.Append(RepeatIndent(indent, currentLevel));
                sb.Append(ApplyCasing(matchedMinor, request.Casing));
                sb.Append(' ');
                isAtLineStart = false;

                int wordsInClause = matchedMinor.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                i += (wordsInClause - 1);
                continue;
            }

            // Comma handling
            if (token.Value == ",")
            {
                if (request.Comma == CommaPosition.EndOfLine)
                {
                    sb.Append(',');
                    sb.AppendLine();
                    isAtLineStart = true;
                }
                else // StartOfLine
                {
                    sb.AppendLine();
                    sb.Append(RepeatIndent(indent, currentLevel));
                    sb.Append(", ");
                    isAtLineStart = false;
                }
                continue;
            }

            // Semicolon
            if (token.Value == ";")
            {
                sb.Append(';');
                sb.AppendLine();
                isAtLineStart = true;
                currentLevel = 0;
                continue;
            }

            // Regular tokens
            if (isAtLineStart)
            {
                sb.Append(RepeatIndent(indent, currentLevel));
                isAtLineStart = false;
            }
            else
            {
                // Add space between tokens if not parenthesis or dot
                char lastChar = sb.Length > 0 ? sb[^1] : ' ';
                if (lastChar != ' ' && lastChar != '\n' && lastChar != '\r' && lastChar != '(' && lastChar != '.' && token.Value != ")")
                {
                    sb.Append(' ');
                }
            }

            if (token.Type == TokenType.Keyword || AllKeywords.Contains(token.Value))
            {
                sb.Append(ApplyCasing(token.Value, request.Casing));
            }
            else
            {
                sb.Append(token.Value);
            }
        }

        var formatted = sb.ToString().Trim();
        sw.Stop();

        var lines = formatted.Split('\n');
        return new SqlFormatResult(
            Success: true,
            FormattedSql: formatted,
            Dialect: request.Dialect ?? "postgresql",
            LineCount: lines.Length,
            CharacterCount: formatted.Length,
            ElapsedMilliseconds: sw.ElapsedMilliseconds
        );
    }

    public SqlMinifyResult Minify(SqlMinifyRequest request)
    {
        var raw = request.Sql ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new SqlMinifyResult(true, string.Empty, 0, 0, 0);
        }

        int origLen = raw.Length;
        var tokens = Tokenize(raw);
        var sb = new StringBuilder();

        for (int i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];

            if (token.Type == TokenType.Comment)
            {
                if (request.PreserveComments)
                {
                    sb.Append(token.Value.Trim());
                    sb.Append(' ');
                }
                continue;
            }

            if (token.Type == TokenType.Whitespace)
            {
                if (sb.Length > 0 && sb[^1] != ' ' && sb[^1] != '(' && sb[^1] != ',')
                {
                    sb.Append(' ');
                }
                continue;
            }

            if (token.Value == "," || token.Value == ";")
            {
                if (sb.Length > 0 && sb[^1] == ' ') sb.Length--; // remove space before comma/semicolon
                sb.Append(token.Value);
                sb.Append(' ');
                continue;
            }

            sb.Append(token.Value);
        }

        var minified = Regex.Replace(sb.ToString().Trim(), @"\s+", " ");
        // remove spaces inside parentheses
        minified = Regex.Replace(minified, @"\(\s+", "(");
        minified = Regex.Replace(minified, @"\s+\)", ")");

        int minLen = minified.Length;
        double ratio = origLen > 0 ? Math.Round(((origLen - minLen) / (double)origLen) * 100.0, 1) : 0;

        return new SqlMinifyResult(true, minified, origLen, minLen, ratio);
    }

    public SqlValidationResult Validate(SqlValidationRequest request)
    {
        var raw = request.Sql ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new SqlValidationResult(false, "EMPTY", new List<SqlDiagnosticError>
            {
                new(1, 1, "Kueri SQL kosong. Silakan masukkan script SQL yang ingin divalidasi.")
            }, new List<string>());
        }

        var errors = new List<SqlDiagnosticError>();
        var detectedKeywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Check parentheses and quote balance
        var parenStack = new Stack<(char Char, int Line, int Col)>();
        int currentLine = 1;
        int currentCol = 1;
        bool inSingleQuote = false;
        int quoteStartLine = 1;
        int quoteStartCol = 1;
        bool inDoubleQuote = false;
        bool inBlockComment = false;

        for (int i = 0; i < raw.Length; i++)
        {
            char c = raw[i];

            if (c == '\n')
            {
                currentLine++;
                currentCol = 1;
                continue;
            }
            else
            {
                currentCol++;
            }

            // Block comments
            if (!inSingleQuote && !inDoubleQuote)
            {
                if (!inBlockComment && i + 1 < raw.Length && c == '/' && raw[i + 1] == '*')
                {
                    inBlockComment = true;
                    i++;
                    continue;
                }
                if (inBlockComment && i + 1 < raw.Length && c == '*' && raw[i + 1] == '/')
                {
                    inBlockComment = false;
                    i++;
                    continue;
                }
            }

            if (inBlockComment) continue;

            // Single line comment
            if (!inSingleQuote && !inDoubleQuote && i + 1 < raw.Length && c == '-' && raw[i + 1] == '-')
            {
                while (i < raw.Length && raw[i] != '\n') i++;
                currentLine++;
                currentCol = 1;
                continue;
            }

            // Strings
            if (c == '\'' && !inDoubleQuote)
            {
                if (inSingleQuote && i + 1 < raw.Length && raw[i + 1] == '\'')
                {
                    i++; // escaped quote
                    continue;
                }
                inSingleQuote = !inSingleQuote;
                if (inSingleQuote)
                {
                    quoteStartLine = currentLine;
                    quoteStartCol = currentCol;
                }
                continue;
            }

            if (c == '"' && !inSingleQuote)
            {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }

            if (inSingleQuote || inDoubleQuote) continue;

            // Parentheses check
            if (c == '(' || c == '[')
            {
                parenStack.Push((c, currentLine, currentCol));
            }
            else if (c == ')' || c == ']')
            {
                if (parenStack.Count == 0)
                {
                    errors.Add(new SqlDiagnosticError(currentLine, currentCol,
                        $"Tanda kurung penutup '{c}' pada baris {currentLine} kolom {currentCol} tidak memiliki kurung pembuka."));
                }
                else
                {
                    var open = parenStack.Pop();
                    if ((open.Char == '(' && c != ')') || (open.Char == '[' && c != ']'))
                    {
                        errors.Add(new SqlDiagnosticError(currentLine, currentCol,
                            $"Pasangan kurung tidak cocok: '{open.Char}' ditutup oleh '{c}' pada baris {currentLine} kolom {currentCol}."));
                    }
                }
            }
        }

        if (inSingleQuote)
        {
            errors.Add(new SqlDiagnosticError(quoteStartLine, quoteStartCol,
                $"Tanda kutip string literal ('...') pada baris {quoteStartLine} tidak tertutup sampai akhir kueri."));
        }

        while (parenStack.Count > 0)
        {
            var unclosed = parenStack.Pop();
            errors.Add(new SqlDiagnosticError(unclosed.Line, unclosed.Col,
                $"Tanda kurung pembuka '{unclosed.Char}' pada baris {unclosed.Line} kolom {unclosed.Col} tidak memiliki kurung penutup."));
        }

        // Detect statement type and keywords
        var tokens = Tokenize(raw);
        string statementType = "UNKNOWN";

        foreach (var t in tokens)
        {
            if (AllKeywords.Contains(t.Value))
            {
                detectedKeywords.Add(t.Value.ToUpperInvariant());
                if (statementType == "UNKNOWN")
                {
                    var upper = t.Value.ToUpperInvariant();
                    if (upper is "SELECT" or "INSERT" or "UPDATE" or "DELETE" or "CREATE" or "ALTER" or "DROP" or "WITH" or "TRUNCATE" or "MERGE")
                    {
                        statementType = upper;
                    }
                }
            }
        }

        return new SqlValidationResult(
            IsValid: errors.Count == 0,
            StatementType: statementType,
            Errors: errors,
            DetectedKeywords: detectedKeywords.ToList()
        );
    }

    public IReadOnlyList<SqlDialectInfo> GetSupportedDialects()
    {
        return new List<SqlDialectInfo>
        {
            new("postgresql", "PostgreSQL", "Relational", "Enterprise object-relational database with JSONB, window functions, and CTEs", "database"),
            new("mysql", "MySQL", "Relational", "World's most popular open-source relational database engine with backtick identifiers", "server"),
            new("tsql", "SQL Server (T-SQL)", "Relational", "Microsoft relational database engine with TOP, CROSS APPLY, and bracket identifiers", "hard-drive"),
            new("oracle", "Oracle PL/SQL", "Relational", "High-performance commercial relational engine with ROWNUM and FETCH FIRST", "layers"),
            new("sqlite", "SQLite", "Embedded", "Lightweight, serverless embedded transactional database engine", "cpu"),
            new("bigquery", "Google BigQuery", "Cloud DW", "Google Cloud petabyte-scale serverless analytics data warehouse", "cloud"),
            new("snowflake", "Snowflake", "Cloud DW", "Elastic cloud data warehouse featuring QUALIFY and lateral flatten arrays", "snowflake"),
            new("redshift", "Amazon Redshift", "Cloud DW", "AWS columnar cloud data warehouse with distribution and sort keys", "database"),
            new("db2", "IBM DB2", "Mainframe", "IBM enterprise database with FETCH FIRST n ROWS ONLY and isolation clauses", "terminal"),
            new("mariadb", "MariaDB", "Relational", "Enhanced community fork of MySQL with temporal tables and JSON extensions", "server"),
            new("cockroachdb", "CockroachDB", "Distributed", "Cloud-native distributed SQL engine with serializable isolation", "git-branch"),
            new("couchbase", "Couchbase N1QL", "NoSQL", "SQL-for-Documents query language with UNNEST, META().id, and nest arrays", "file-json"),
            new("spark", "Apache Spark SQL", "Big Data", "Distributed large-scale data processing engine with LATERAL VIEW", "zap"),
            new("trino", "Trino / Presto", "Distributed", "Fast distributed SQL query engine for data lakes and federated analytics", "globe"),
            new("ansi", "Standard ANSI SQL", "Standard", "ANSI/ISO Standard SQL core specification with common clauses", "code")
        };
    }

    public string GetSampleQuery(string dialectCode, string sampleType)
    {
        dialectCode = dialectCode.ToLowerInvariant();
        sampleType = sampleType.ToLowerInvariant();

        return (dialectCode, sampleType) switch
        {
            ("postgresql", "cte") =>
                "WITH regional_sales AS (\n  SELECT region, SUM(amount) AS total_sales\n  FROM orders\n  WHERE order_date >= '2026-01-01'\n  GROUP BY region\n),\ntop_regions AS (\n  SELECT region\n  FROM regional_sales\n  WHERE total_sales > 1000000\n)\nSELECT r.region, p.product_name, SUM(o.amount) AS product_sales\nFROM orders o\nJOIN top_regions r ON o.region = r.region\nJOIN products p ON o.product_id = p.id\nGROUP BY r.region, p.product_name\nORDER BY product_sales DESC;",

            ("postgresql", "window") =>
                "SELECT\n  employee_id, department_id, salary,\n  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank_in_dept,\n  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg_salary,\n  salary - AVG(salary) OVER (PARTITION BY department_id) AS diff_from_avg\nFROM employees\nWHERE is_active = true;",

            ("postgresql", "ddl") =>
                "CREATE TABLE tasks (\n  id SERIAL PRIMARY KEY,\n  title VARCHAR(255) NOT NULL,\n  description TEXT,\n  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,\n  status INTEGER NOT NULL DEFAULT 1,\n  priority INTEGER NOT NULL DEFAULT 2,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP\n);",

            ("bigquery", _) =>
                "SELECT\n  user_id,\n  ARRAY_AGG(STRUCT(event_name, event_timestamp) ORDER BY event_timestamp DESC LIMIT 5) AS recent_events,\n  COUNT(1) AS total_events\nFROM `my_project.analytics.user_events`\nWHERE DATE(_PARTITIONTIME) = '2026-10-13'\nGROUP BY user_id\nHAVING total_events > 10\nORDER BY total_events DESC;",

            ("snowflake", _) =>
                "SELECT\n  c.customer_id,\n  c.company_name,\n  SUM(o.total_amount) AS lifetime_value,\n  ROW_NUMBER() OVER (ORDER BY SUM(o.total_amount) DESC) AS rank\nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nWHERE c.is_active = TRUE\nGROUP BY c.customer_id, c.company_name\nQUALIFY rank <= 100\nORDER BY rank ASC;",

            ("tsql", _) =>
                "SELECT TOP 25\n  p.ProductID, p.Name, p.ListPrice, s.QuantitySold\nFROM Production.Product AS p\nCROSS APPLY (\n  SELECT SUM(OrderQty) AS QuantitySold\n  FROM Sales.SalesOrderDetail AS sod\n  WHERE sod.ProductID = p.ProductID\n) AS s\nWHERE p.ListPrice > 500\nORDER BY s.QuantitySold DESC;",

            ("oracle", _) =>
                "SELECT e.employee_id, e.first_name, e.last_name, e.salary, d.department_name\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nWHERE e.salary > 5000\nORDER BY e.salary DESC\nFETCH FIRST 20 ROWS ONLY;",

            ("mysql", _) =>
                "SELECT `u`.`id`, `u`.`full_name`, `u`.`email`, COUNT(`t`.`id`) AS `total_tasks`\nFROM `users` AS `u`\nLEFT JOIN `tasks` AS `t` ON `u`.`id` = `t`.`assigned_to`\nWHERE `u`.`is_approved` = 1\nGROUP BY `u`.`id`, `u`.`full_name`, `u`.`email`\nORDER BY `total_tasks` DESC\nLIMIT 10 OFFSET 0;",

            ("sqlite", _) =>
                "SELECT id, title, status, priority, created_at\nFROM work_tasks\nWHERE company_id = 1 AND is_deleted = 0\nORDER BY priority DESC, created_at DESC\nLIMIT 50;",

            _ =>
                "SELECT\n  id, title, status, priority, created_at\nFROM tasks\nWHERE is_active = true\nORDER BY created_at DESC\nLIMIT 20;"
        };
    }

    private static string ApplyCasing(string text, KeywordCase casing) => casing switch
    {
        KeywordCase.Upper => text.ToUpperInvariant(),
        KeywordCase.Lower => text.ToLowerInvariant(),
        _ => text
    };

    private static string RepeatIndent(string indent, int level)
    {
        if (level <= 0) return string.Empty;
        var sb = new StringBuilder();
        for (int i = 0; i < level; i++) sb.Append(indent);
        return sb.ToString();
    }

    private static string MatchMultiWordClause(List<Token> tokens, int startIndex, HashSet<string> clauses)
    {
        // Try 3 words down to 1 word
        for (int len = 3; len >= 1; len--)
        {
            if (startIndex + len <= tokens.Count)
            {
                var words = new List<string>();
                bool valid = true;
                for (int j = 0; j < len; j++)
                {
                    var t = tokens[startIndex + j];
                    if (t.Type == TokenType.Whitespace || t.Type == TokenType.Comment)
                    {
                        valid = false;
                        break;
                    }
                    words.Add(t.Value);
                }

                if (valid)
                {
                    string candidate = string.Join(" ", words);
                    if (clauses.Contains(candidate))
                    {
                        return candidate;
                    }
                }
            }
        }
        return string.Empty;
    }

    private static List<Token> Tokenize(string sql)
    {
        var tokens = new List<Token>();
        int i = 0;

        while (i < sql.Length)
        {
            char c = sql[i];

            // Whitespace
            if (char.IsWhiteSpace(c))
            {
                int start = i;
                while (i < sql.Length && char.IsWhiteSpace(sql[i])) i++;
                tokens.Add(new Token(TokenType.Whitespace, sql[start..i]));
                continue;
            }

            // Single line comment
            if (c == '-' && i + 1 < sql.Length && sql[i + 1] == '-')
            {
                int start = i;
                while (i < sql.Length && sql[i] != '\n') i++;
                tokens.Add(new Token(TokenType.Comment, sql[start..i]));
                continue;
            }

            // Block comment
            if (c == '/' && i + 1 < sql.Length && sql[i + 1] == '*')
            {
                int start = i;
                i += 2;
                while (i + 1 < sql.Length && !(sql[i] == '*' && sql[i + 1] == '/')) i++;
                if (i + 1 < sql.Length) i += 2;
                tokens.Add(new Token(TokenType.Comment, sql[start..i]));
                continue;
            }

            // String literals
            if (c == '\'')
            {
                int start = i;
                i++;
                while (i < sql.Length)
                {
                    if (sql[i] == '\'')
                    {
                        if (i + 1 < sql.Length && sql[i + 1] == '\'')
                        {
                            i += 2; // escaped
                            continue;
                        }
                        i++;
                        break;
                    }
                    i++;
                }
                tokens.Add(new Token(TokenType.Literal, sql[start..i]));
                continue;
            }

            // Double quoted identifiers
            if (c == '"' || c == '`' || c == '[')
            {
                char closer = c == '[' ? ']' : c;
                int start = i;
                i++;
                while (i < sql.Length && sql[i] != closer) i++;
                if (i < sql.Length) i++;
                tokens.Add(new Token(TokenType.Identifier, sql[start..i]));
                continue;
            }

            // Operators & Punctuation
            if (",;().=<>!+-*/%".Contains(c))
            {
                tokens.Add(new Token(TokenType.Punctuation, c.ToString()));
                i++;
                continue;
            }

            // Word tokens (identifiers / keywords)
            if (char.IsLetterOrDigit(c) || c == '_')
            {
                int start = i;
                while (i < sql.Length && (char.IsLetterOrDigit(sql[i]) || sql[i] == '_')) i++;
                string word = sql[start..i];
                var type = AllKeywords.Contains(word) ? TokenType.Keyword : TokenType.Identifier;
                tokens.Add(new Token(type, word));
                continue;
            }

            tokens.Add(new Token(TokenType.Unknown, c.ToString()));
            i++;
        }

        return tokens;
    }

    private enum TokenType
    {
        Whitespace,
        Comment,
        Keyword,
        Identifier,
        Literal,
        Punctuation,
        Unknown
    }

    private record Token(TokenType Type, string Value);
}
