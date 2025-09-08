import fs from "node:fs/promises";
import path from "node:path";
import { Book } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "books.json");

export async function ensureStorageInitialized(): Promise<void> {
	await fs.mkdir(dataDir, { recursive: true });
	await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
	try {
		await fs.access(dbFile);
	} catch {
		await fs.writeFile(dbFile, JSON.stringify([], null, 2), "utf-8");
	}
}

export async function readBooks(): Promise<Book[]> {
	const raw = await fs.readFile(dbFile, "utf-8");
	try {
		const parsed = JSON.parse(raw) as Book[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export async function saveBooks(books: Book[]): Promise<void> {
	await fs.writeFile(dbFile, JSON.stringify(books, null, 2), "utf-8");
}


