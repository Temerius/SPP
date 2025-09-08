import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import dayjs from "dayjs";
import { ensureStorageInitialized, readBooks, saveBooks } from "./storage";
import { Book, BookStatus, NewBook } from "./types";
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
			dueDate: it.dueDate ? String(it.dueDate) : undefined,
			attachmentPath: it.attachmentPath ? String(it.attachmentPath) : undefined,
			createdAt: String(it.createdAt ?? new Date().toISOString()),
		})) as Book[];
		await saveBooks(sanitized);
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
		dueDate: dueDate ? dayjs(dueDate).toISOString() : undefined,
		attachmentPath: req.file ? `/uploads/${req.file.filename}` : undefined,
		createdAt: new Date().toISOString(),
	};
	const books = await readBooks();
	books.push(newBook as Book);
	await saveBooks(books);
	res.redirect("/books");
});


app.get("/books/:id/edit", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const books = await readBooks();
	const book = books.find((b) => b.id === id);
	if (!book) return res.redirect("/books");
	res.render("edit", { title: `Edit ${book.title}`, book, dayjs });
});


app.post("/books/:id", upload.single("attachment"), async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { title, author, dueDate, status } = req.body as Record<string, string>;
	const books = await readBooks();
	const idx = books.findIndex((b) => b.id === id);
	if (idx === -1) return res.redirect("/books");
	books[idx].title = title?.trim() || books[idx].title;
	books[idx].author = author?.trim() || books[idx].author;
	books[idx].status = (status as BookStatus) || books[idx].status;
	books[idx].dueDate = dueDate ? dayjs(dueDate).toISOString() : undefined;
	if (req.file) {
		
		if (books[idx].attachmentPath) {
			try {
				const filename = path.basename(books[idx].attachmentPath);
				await fs.rm(path.join(process.cwd(), "uploads", filename), { force: true });
			} catch {}
		}
		books[idx].attachmentPath = `/uploads/${req.file.filename}`;
	}
	await saveBooks(books);
	res.redirect("/books");
});


app.post("/books/:id/status", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const { status } = req.body as { status: BookStatus };
	const books = await readBooks();
	const idx = books.findIndex((b) => b.id === id);
	if (idx !== -1) {
		books[idx].status = status;
		await saveBooks(books);
	}
	res.redirect("/books");
});


app.post("/books/:id/delete", async (req: Request, res: Response) => {
	await ensureStorageInitialized();
	const { id } = req.params;
	const books = await readBooks();
	const target = books.find((b) => b.id === id);
	const next = books.filter((b) => b.id !== id);
	
	if (target?.attachmentPath) {
		try {
			const filename = path.basename(target.attachmentPath);
			const absolute = path.join(process.cwd(), "uploads", filename);
			await fs.rm(absolute, { force: true });
		} catch {
			
		}
	}
	await saveBooks(next);
	res.redirect("/books");
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