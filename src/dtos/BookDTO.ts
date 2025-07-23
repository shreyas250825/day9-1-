// src/dtos/BookDTO.ts
import { Expose, Exclude } from 'class-transformer';

export class BookDTO {
    @Expose()
    title: string;

    @Expose()
    author: string;

    @Expose()
    publishedYear: number;

    @Expose()
    isbn: string;

    @Exclude()
    internalNotes: string;

    constructor(
        title: string,
        author: string,
        publishedYear: number,
        isbn: string,
        internalNotes: string
    ) {
        this.title = title;
        this.author = author;
        this.publishedYear = publishedYear;
        this.isbn = isbn;
        this.internalNotes = internalNotes;
    }
}