import { sql } from '@vercel/postgres';

if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
}

type CustomerRecord = Record<string, any>;

let initialized = false;

const ensureTable = async () => {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'hearing',
      answers JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT,
      html_code TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;

  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_id TEXT`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'hearing'`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS html_code TEXT`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb`;

  const idTypeResult = await sql`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'customers'
      AND column_name = 'id'
    LIMIT 1
  `;

  const idDataType = String(idTypeResult.rows?.[0]?.data_type || '').toLowerCase();
  if (idDataType && idDataType !== 'text') {
    await sql`ALTER TABLE customers ALTER COLUMN id DROP DEFAULT`;
    await sql`ALTER TABLE customers ALTER COLUMN id TYPE TEXT USING id::text`;
  }

  await sql`ALTER TABLE customers ALTER COLUMN customer_id TYPE TEXT USING customer_id::text`;
  await sql`ALTER TABLE customers ALTER COLUMN name TYPE TEXT USING name::text`;
  await sql`ALTER TABLE customers ALTER COLUMN status TYPE TEXT USING status::text`;
  await sql`ALTER TABLE customers ALTER COLUMN description TYPE TEXT USING description::text`;
  await sql`ALTER TABLE customers ALTER COLUMN html_code TYPE TEXT USING html_code::text`;

  await sql`CREATE INDEX IF NOT EXISTS customers_updated_at_idx ON customers (updated_at DESC)`;
  initialized = true;
};

const normalizeRow = (row: any): CustomerRecord => {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const answersFromRow = Array.isArray(row.answers) ? row.answers : [];
  const updatedAt = row.updated_at instanceof Date
    ? row.updated_at.toISOString()
    : String(row.updated_at || new Date().toISOString());

  return {
    ...payload,
    id: row.id,
    customer_id: row.customer_id,
    name: row.name,
    status: row.status,
    answers: answersFromRow,
    description: row.description ?? payload.description ?? '',
    htmlCode: row.html_code ?? payload.htmlCode ?? '',
    updatedAt,
  };
};

export const readCustomers = async (): Promise<CustomerRecord[]> => {
  await ensureTable();
  const result = await sql`
    SELECT id, customer_id, name, status, answers, description, html_code, updated_at, payload
    FROM customers
    ORDER BY updated_at DESC
  `;
  return result.rows.map(normalizeRow);
};

export const upsertCustomer = async (customer: CustomerRecord): Promise<CustomerRecord> => {
  await ensureTable();

  let id = String(customer.id || `cust-${Date.now()}`);
  const customerId = String(customer.customer_id || `custsrv-${Date.now()}`);
  const name = String(customer.name || '新規顧客');
  const status = String(customer.status || 'hearing');
  const answers = Array.isArray(customer.answers) ? customer.answers : [];
  const description = customer.description == null ? null : String(customer.description);
  const htmlCode = customer.htmlCode == null ? null : String(customer.htmlCode);
  const updatedAt = customer.updatedAt ? new Date(String(customer.updatedAt)) : new Date();

  if (customerId) {
    const existingByCustomerId = await sql`
      SELECT id
      FROM customers
      WHERE customer_id = ${customerId}
      LIMIT 1
    `;
    const matchedId = existingByCustomerId.rows?.[0]?.id;
    if (matchedId && String(matchedId) !== id) {
      id = String(matchedId);
    }
  }

  const payload = {
    ...customer,
    id,
    customer_id: customerId,
    name,
    status,
    answers,
    description,
    htmlCode,
    updatedAt: updatedAt.toISOString(),
  };

  const answersJson = JSON.stringify(answers);
  const payloadJson = JSON.stringify(payload);

  const result = await sql`
    INSERT INTO customers (id, customer_id, name, status, answers, description, html_code, updated_at, payload)
    VALUES (
      ${id},
      ${customerId},
      ${name},
      ${status},
      ${answersJson}::jsonb,
      ${description},
      ${htmlCode},
      ${updatedAt.toISOString()}::timestamptz,
      ${payloadJson}::jsonb
    )
    ON CONFLICT (id)
    DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      answers = EXCLUDED.answers,
      description = EXCLUDED.description,
      html_code = EXCLUDED.html_code,
      updated_at = EXCLUDED.updated_at,
      payload = EXCLUDED.payload
    RETURNING id, customer_id, name, status, answers, description, html_code, updated_at, payload
  `;

  return normalizeRow(result.rows[0]);
};

export const deleteCustomerById = async (id: string): Promise<void> => {
  await ensureTable();
  await sql`DELETE FROM customers WHERE id = ${id}`;
};
