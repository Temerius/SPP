import express, { type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import dayjs from "dayjs";
import { ensureStorageInitialized, readBooks, insertBook, readBookById, updateBook, updateBookStatus, deleteBook, replaceAllBooks } from "./storage.ts";
import type { Book, BookStatus, NewBook } from "./types.ts";
import { v4 as uuid } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;


app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));


app.use("/public", express.static(path.join(process.cwd(), "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


app.use(express.urlencoded({ extended: true }));


const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
	destination: uploadDir,
	filename: (_req, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
		cb(null, `${unique}-${safe}`);
	},
});
const upload = multer({ storage });


app.get(["/", "/books"], async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { status, q, sort } = req.query as { status?: BookStatus; q?: string; sort?: string };
	const books = await readBooks();
	let filtered = status ? books.filter((b) => b.status === status) : books;
	if (q && q.trim()) {
		const needle = q.trim().toLowerCase();
		filtered = filtered.filter((b) =>
			(b.title?.toLowerCase().includes(needle) ?? false) ||
			(b.author?.toLowerCase().includes(needle) ?? false)
		);
	}
	if (sort) {
		filtered = [...filtered].sort((a, b) => {
			switch (sort) {
				case "title":
					return (a.title || "").localeCompare(b.title || "");
				case "author":
					return (a.author || "").localeCompare(b.author || "");
				case "status":
					return (a.status || "").localeCompare(b.status || "");
				case "dueDate":
					return (a.dueDate || "").localeCompare(b.dueDate || "");
				case "createdAt":
				default:
					return (a.createdAt || "").localeCompare(b.createdAt || "");
			}
		});
	}
	const stats = {
		planned: books.filter((b) => b.status === "planned").length,
		reading: books.filter((b) => b.status === "reading").length,
		done: books.filter((b) => b.status === "done").length,
		total: books.length,
	};
	const isPartial = req.query.partial === '1';
	const renderData = {
		title: "Reading Tracker",
		books: filtered,
		filters: { status: status ?? "", q: q ?? "", sort: sort ?? "createdAt" },
		stats,
		dayjs,
	};
	if (isPartial) {
		return res.render("partials/list", renderData);
	}
	res.render("index", renderData);
});


app.get("/books/new", (_req: Request, res: Response) => {
	res.render("new", { title: "Add Book", dayjs });
});


app.get("/books/export", async (_req: Request, res: Response) => {
	await ensureStorageInitialized();
	const books = await readBooks();
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Content-Disposition", 'attachment; filename="books-export.json"');
	res.send(JSON.stringify(books, null, 2));
});


app.get("/books/import", (_req: Request, res: Response) => {
	res.render("import", { title: "Import Books" });
});


app.post("/books/import", upload.any(), async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const files = (req as any).files as Array<{ path: string; mimetype?: string }> | undefined;
	const jsonFile = files?.find((f) => (f.mimetype?.includes("json") ?? false)) ?? files?.[0];
	if (!jsonFile) return res.redirect("/books");
	try {
		const content = await fs.readFile(jsonFile.path, "utf-8");
		const parsed = JSON.parse(content);
		if (!Array.isArray(parsed)) throw new Error("Invalid format");
		const sanitized = parsed.map((it: any) => ({
			id: String(it.id ?? uuid()),
			title: String(it.title ?? "Untitled"),
			author: String(it.author ?? ""),
			status: (it.status === "planned" || it.status === "reading" || it.status === "done") ? it.status : "planned",
			...(it.dueDate ? { dueDate: String(it.dueDate) } : {}),
			...(it.attachmentPath ? { attachmentPath: String(it.attachmentPath) } : {}),
			createdAt: String(it.createdAt ?? new Date().toISOString()),
		})) as Book[];
		await replaceAllBooks(sanitized);
	} catch {}
	res.redirect("/books");
});

app.post("/books", upload.single("attachment"), async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { title, author, dueDate, status } = req.body as Record<string, string>;
	const id = uuid();
	const newBook: NewBook = {
		id,
		title: title?.trim() || "Untitled",
		author: author?.trim() || "",
		status: (status as BookStatus) || "planned",
		...(dueDate ? { dueDate: dayjs(dueDate).toISOString() } : {}),
		...(req.file ? { attachmentPath: `/uploads/${req.file.filename}` } : {}),
		createdAt: new Date().toISOString(),
	};
	await insertBook(newBook as Book);
	res.redirect("/books");
});


app.get("/books/:id/edit", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { status, q, sort } = req.query as { status?: string; q?: string; sort?: string };
	const book = await readBookById(id);
	if (!book) return res.redirect("/books");
	res.render("edit", { title: `Edit ${book.title}`, book, dayjs, filters: { status: status ?? "", q: q ?? "", sort: sort ?? "createdAt" } });
});


app.post("/books/:id", upload.single("attachment"), async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { title, author, dueDate, status } = req.body as Record<string, string>;
	const { statusFilter, q, sort } = req.body as Record<string, string>;
	const existing = await readBookById(id);
	if (!existing) return res.redirect("/books");
	const next: Book = {
		...existing,
		title: title?.trim() || existing.title,
		author: author?.trim() || existing.author,
		status: (status as BookStatus) || existing.status,
		...(dueDate ? { dueDate: dayjs(dueDate).toISOString() } : {}),
		...(existing.attachmentPath ? { attachmentPath: existing.attachmentPath } : {}),
		createdAt: existing.createdAt,
	};
	if (req.file) {
		const oldAttachment = existing.attachmentPath;
		if (oldAttachment) {
			try {
				const filename = path.basename(oldAttachment as string);
				await fs.rm(path.join(process.cwd(), "uploads", filename), { force: true });
			} catch {}
		}
		(next as any).attachmentPath = `/uploads/${req.file.filename}`;
	}
	await updateBook(next);
	const params = new URLSearchParams();
	if (statusFilter) params.set('status', statusFilter);
	if (q) params.set('q', q);
	params.set('sort', sort || 'createdAt');
	res.redirect(`/books${params.toString() ? ('?' + params.toString()) : ''}`);
});


app.post("/books/:id/status", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { status } = req.body as { status: BookStatus };
	const { statusFilter, q, sort } = req.body as Record<string, string>;
	await updateBookStatus(id, status);
	const params = new URLSearchParams();
	if (statusFilter) params.set('status', statusFilter);
	if (q) params.set('q', q);
	params.set('sort', sort || 'createdAt');
	res.redirect(`/books${params.toString() ? ('?' + params.toString()) : ''}`);
});


app.post("/books/:id/delete", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { status, q, sort } = req.body as Record<string, string>;
	const target = await readBookById(id);
	if (target?.attachmentPath) {
		try {
			const filename = path.basename(target.attachmentPath as string);
			const absolute = path.join(process.cwd(), "uploads", filename);
			await fs.rm(absolute, { force: true });
		} catch {
			
		}
	}
	await deleteBook(id);
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	if (q) params.set('q', q);
	params.set('sort', sort || 'createdAt');
	res.redirect(`/books${params.toString() ? ('?' + params.toString()) : ''}`);
});



app.get("/healthz", (_req, res) => {
	res.type("text").send("ok");
});


async function start() {
	await ensureStorageInitialized();
	app.listen(PORT, () => {
		console.log(`Reading Tracker listening on http://localhost:${PORT}`);
	});
}

start();