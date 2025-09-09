CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.books (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('planned','reading','done')),
  due_date TIMESTAMPTZ NULL,
  attachment_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_status ON app.books(status);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON app.books(created_at DESC);


