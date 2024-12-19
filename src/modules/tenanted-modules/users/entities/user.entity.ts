import { Column, Entity } from "typeorm";
import { AbstractEntity } from "../../../../database/utils/abstract.entity";

@Entity({ name: 'users' })
export class User extends AbstractEntity {
  @Column()
  name: string;
}
