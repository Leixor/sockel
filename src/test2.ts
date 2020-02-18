import { ServerOptions } from "ws";

type User = { id: string };

class Test<T extends User> {
    private constructor(user: T) {}

    testFunction(user: T) {}

    public static create(options?: { option?: User }): Test<User>;
    public static create<T extends User>(options: { option: T }): Test<T>;
    public static create<T extends User>(options: { option: User } = { option: { id: "" } }) {
        return new this(options.option);
    }
}

class West<T extends User> {
    private constructor(userFunction: () => T) {}

    testFunction(user: T) {}

    public static create(options?: { option?: undefined }): West<User>;
    public static create<T extends User>(options: { option: () => T }): West<T>;
    public static create<T extends User>(options: { option?: undefined | (() => T) } = { option: undefined }) {
        if (options.option === undefined) {
            return new this(() => ({ id: "" }));
        } else {
            return new this(options.option);
        }
    }
}

const user = () => ({ id: "", type: 3 });

const t = Test.create({ option: user() });
const w = West.create({ option: user });
