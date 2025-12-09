import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function setupExtensions() {
  // Criar extensão UUId apenas UMA vez
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  console.log('Extensão uuid-ossp verificada');
}

async function seedUsers() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  console.log(`Inseridos ${insertedUsers.length} usuários`);
  return insertedUsers;
}

async function seedCustomers() {
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  console.log(`Inseridos ${insertedCustomers.length} clientes`);
  return insertedCustomers;
}

async function seedInvoices() {
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  console.log(`Inseridas ${insertedInvoices.length} faturas`);
  return insertedInvoices;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  console.log(`Inseridos ${insertedRevenue.length} registros de receita`);
  return insertedRevenue;
}

export async function GET() {
  try {
    console.log('Iniciando seed do banco de dados...');
    
    // Setup inicial
    await setupExtensions();
    
    // Seed em ordem correta (considerando dependências)
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    
    console.log('Seed concluído com sucesso!');
    
    return Response.json({ 
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Erro durante o seed:', error);

    const message =
      error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        error: message,
        details: 'Verifique se a extensão uuid-ossp está disponível no Neon',
      },
      { status: 500 }
    );
  }
}
