-- Evoque Lebanon portal schema. Idempotent: safe to run on every deploy.
create table if not exists users (
  id serial primary key,
  username text not null unique,
  name text not null,
  role text not null check (role in ('admin','driver')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  user_id int not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists login_attempts (
  username text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_idx on login_attempts (username, at);

create table if not exists orders (
  id serial primary key,
  number text unique,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','confirmed','out_for_delivery','delivered','cancelled','returned')),
  source text not null default 'web' check (source in ('web','manual')),
  customer_name text not null,
  phone text not null,
  area text not null,
  address text not null,
  notes text not null default '',
  internal_note text not null default '',
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  delivery_cost numeric(10,2),
  payment_method text not null default 'cod' check (payment_method in ('cod','whish','omt')),
  paid boolean not null default false,
  paid_at timestamptz,
  delivered_at timestamptz,
  driver_id int references users(id) on delete set null,
  created_by int references users(id) on delete set null,
  ip_hash text
);
create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_items (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  variant_id bigint not null,
  handle text not null,
  title text not null,
  variant_title text not null,
  price numeric(10,2) not null,
  qty int not null check (qty > 0)
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists order_events (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  at timestamptz not null default now(),
  user_id int references users(id) on delete set null,
  text text not null
);
create index if not exists order_events_order_idx on order_events (order_id, at);

-- One row per product size. qty null = stock not tracked (always available).
create table if not exists stock (
  variant_id bigint primary key,
  handle text not null,
  qty int,
  low_alert int not null default 3,
  price numeric(10,2),
  cost numeric(10,2)
);
create table if not exists product_settings (
  handle text primary key,
  hidden boolean not null default false
);
create table if not exists stock_moves (
  id serial primary key,
  variant_id bigint not null,
  at timestamptz not null default now(),
  user_id int references users(id) on delete set null,
  order_id int references orders(id) on delete set null,
  delta int,
  qty_after int,
  reason text not null
);
create index if not exists stock_moves_variant_idx on stock_moves (variant_id, at desc);

create table if not exists settings (
  key text primary key,
  value text not null
);
insert into settings (key, value) values ('default_delivery_cost', '3') on conflict do nothing;
