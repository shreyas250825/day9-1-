import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/**
 * User entity representing application users
 */
@Entity({ name: "users" })  // Explicit table name
export class User {
    @PrimaryGeneratedColumn("increment")
    id!: number;

    @Column({
        type: "varchar",
        length: 100,
        nullable: false
    })
    name!: string;

    @Column({
        type: "varchar",
        length: 255,
        unique: true,
        nullable: false
    })
    email!: string;

    @Column({
        type: "varchar",
        length: 255,
        nullable: false,
        select: false  // Password won't be selected by default
    })
    password!: string;

    @Column({
        type: "smallint",
        default: 0,
        comment: "0 = regular user, 1 = admin"
    })
    user_type_id!: number;
}