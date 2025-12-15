import { ProgrammingLanguage } from "@athena/types";

/**
 * Generates a wrapper script based on the target programming language.
 * Implements the Factory pattern to delegate code generation to specific templates.
 *
 * @param language The target programming language (e.g., SQL).
 * @param inputData Setup code or data (e.g., SQL DDL/DML for table creation).
 * @param initialCode The user's solution code to be executed.
 * @param testCasesCode Testing logic (e.g., assertions) to verify the result.
 * @returns The complete executable source code string wrapped in the language-specific template.
 * @throws Error if no wrapper generator is defined for the provided language.
 */
export const generateWrapper = (
  language: ProgrammingLanguage,
  inputData: string = "",
  initialCode: string,
  testCasesCode: string = "",
): string => {
  switch (language) {
    case ProgrammingLanguage.SQL:
      return generateSqlWrapper(inputData, initialCode, testCasesCode);

    default:
      throw new Error(`No wrapper generator defined for language: ${language}`);
  }
};

/**
 * @function generateSqlWrapper
 * Generates a Python script that executes SQL code safely against a PostgreSQL database.
 * * Logic flow:
 * 1. Establishes a connection using environment variables (DB_HOST, etc.).
 * 2. Starts an implicit transaction.
 * 3. Executes the setup SQL (DDL/DML) provided in 'setupSql'.
 * 4. Executes the student's query provided in 'studentSql'.
 * 5. Fetches results into the 'result' variable (if it was a SELECT).
 * 6. Executes Python unit tests (assertions) provided in 'testCasesCode'.
 * 7. Always performs a ROLLBACK to clean the database state before closing.
 *
 * @param setupSql SQL script for database preparation (CREATE TABLE, INSERT).
 * @param studentSql The user's SQL code to be executed.
 * @param testCasesCode Python code containing assertions to check the result.
 * @returns The final Python source code string.
 */
const generateSqlWrapper = (setupSql: string = "", studentSql: string, testCasesCode: string = ""): string => {
  const safeSetup = JSON.stringify(setupSql);
  const safeStudent = JSON.stringify(studentSql);

  const indentedTests = indentCode(testCasesCode, 8);

  return `
import psycopg2
import os
import sys
import json
from datetime import date, datetime
from decimal import Decimal

# Database connection configuration (retrieved from isolate's ENV)
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "postgres"),
    "dbname": os.environ.get("DB_NAME", "postgres"),
    "port": os.environ.get("DB_PORT", "5432"),
}

def clean_value(value):
    """Converts complex types (Decimal, Date) to serializable strings."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value) if value is not None else None

def run():
    conn = None
    try:
        # Establish connection
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # 1. SETUP (DDL/DML from inputData)
        setup_sql = ${safeSetup}
        if setup_sql and setup_sql.strip():
            cur.execute(setup_sql)

        # 2. STUDENT QUERY (from initialCode)
        student_sql = ${safeStudent}
        if student_sql and student_sql.strip():
            cur.execute(student_sql)

            # Attempt to fetch results for testing/IO Check mode
            result = []
            if cur.description: # Check if it was a SELECT query
                rows = cur.fetchall()
                # Convert to a list of dictionaries for easier testing
                columns = [desc[0] for desc in cur.description]
                for row in rows:
                    clean_row = {}
                    for col, val in zip(columns, row):
                        clean_row[col] = clean_value(val)
                    result.append(clean_row)

            # Output the result to stdout (for IO Check mode or debugging)
            # The 'result' variable is now available for unit tests.
            print(json.dumps(result, indent=2))

        # 3. UNIT TESTS (Python Assertions from testCasesCode)
        # The 'result' variable holds the list of dictionaries from the user's query.
        # The 'cur' variable holds the cursor (for checking rowcount, etc.).
${indentedTests}

        # Optional: Print success message to stdout if needed,
        # but exit code 0 is the primary success indicator.

    except psycopg2.Error as e:
        # Capture specific SQL/DB errors
        print(f"SQL Error: {e.pgcode} - {e.pgerror}", file=sys.stderr)
        sys.exit(1)
    except AssertionError as e:
        # Capture test failures
        print(f"Test Failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        # Capture generic runtime errors
        print(f"Runtime Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    run()
`;
};

/**
 * Helper to correctly indent multi-line user code so it fits inside Python functions/blocks.
 * Adds prefix spaces to every line.
 */
const indentCode = (code: string, spaces: number): string => {
  if (!code) return "";
  const prefix = " ".repeat(spaces);
  return code
    .split("\n")
    .map(line => (line.trim() ? prefix + line : line))
    .join("\n");
};
