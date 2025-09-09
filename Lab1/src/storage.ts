import path from "node:path";
import { Pool } from "pg";
import type { Book } from "./types.ts";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export async function ensureStorageInitialized(): Promise<void> {
	await (await import("node:fs/promises")).mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
}

function asIso(value: unknown): string | undefined {
	if (!value) return undefined;
	if (value instanceof Date) return value.toISOString();
	const d = new Date(String(value));
	return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function readBooks(): Promise<Book[]> {
	const res = await pool.query(
		"SELECT id::text, title, author, status, due_date, attachment_path, created_at FROM app.books ORDER BY created_at DESC"
	);
	return res.rows.map((r: any) => {
		const book: Book = {
			id: String(r.id),
			title: String(r.title ?? ""),
			author: String(r.author ?? ""),
			status: r.status,
			createdAt: asIso(r.created_at) as string,
		};
		const due = asIso(r.due_date);
		if (due) (book as any).dueDate = due;
		if (r.attachment_path) (book as any).attachmentPath = r.attachment_path;
		return book;
	});
}

export async function readBookById(id: string): Promise<Book | undefined> {
	const res = await pool.query(
		"SELECT id::text, title, author, status, due_date, attachment_path, created_at FROM app.books WHERE id = $1",
		[id]
	);
	const r: any = res.rows[0];
	if (!r) return undefined;
	const book: Book = {
		id: String(r.id),
		title: String(r.title ?? ""),
		author: String(r.author ?? ""),
		status: r.status,
		createdAt: asIso(r.created_at) as string,
	};
	const due = asIso(r.due_date);
	if (due) (book as any).dueDate = due;
	if (r.attachment_path) (book as any).attachmentPath = r.attachment_path;
	return book;
}

export async function insertBook(book: Book): Promise<void> {
	await pool.query(
		"INSERT INTO app.books (id, title, author, status, due_date, attachment_path, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
		[book.id, book.title, book.author, book.status, book.dueDate ?? null, book.attachmentPath ?? null, book.createdAt]
	);
}

export async function updateBook(book: Book): Promise<void> {
	await pool.query(
		"UPDATE app.books SET title=$2, author=$3, status=$4, due_date=$5, attachment_path=$6 WHERE id=$1",
		[book.id, book.title, book.author, book.status, book.dueDate ?? null, book.attachmentPath ?? null]
	);
}

export async function updateBookStatus(id: string, status: string): Promise<void> {
	await pool.query("UPDATE app.books SET status=$2 WHERE id=$1", [id, status]);
}

export async function deleteBook(id: string): Promise<void> {
	await pool.query("DELETE FROM app.books WHERE id=$1", [id]);
}

export async function replaceAllBooks(books: Book[]): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("TRUNCATE TABLE app.books");
		for (const b of books) {
			await client.query(
				"INSERT INTO app.books (id, title, author, status, due_date, attachment_path, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
				[b.id, b.title, b.author, b.status, b.dueDate ?? null, b.attachmentPath ?? null, b.createdAt]
			);
		}
		await client.query("COMMIT");
	} catch (e) {
		await client.query("ROLLBACK");
		throw e;
	} finally {
		client.release();
	}
}


