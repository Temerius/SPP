export type BookStatus = "planned" | "reading" | "done";

export interface Book {
	id: string;
	title: string;
	author: string;
	status: BookStatus;
	dueDate?: string;
	attachmentPath?: string;
	createdAt: string;
}

export type NewBook = Book;



