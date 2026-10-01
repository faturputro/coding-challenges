import { AsyncLocalStorage } from 'async_hooks';
import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

type ContextOptions = {
  timestamp?: number,
  id?: string,
  // biome-ignore lint/suspicious/noExplicitAny: data is dynamic
  data?: Record<string, any>
  request?: Record<string, unknown>
  user: {
    id: number
    email: string
  }
};

const als = new AsyncLocalStorage<ContextOptions>();

export const __als = als; // for unit test do not remove

const getStore = () => als.getStore();

export default {
  get id() {
    return getStore()?.id;
  },
  get timestamp() {
    return getStore()?.timestamp;
  },
  get request() {
    return getStore()?.request;
  },
  get data() {
    return getStore()?.data;
  },
  get user() {
    return getStore()?.user ?? {
      id: 0,
      email: '',
    };
  },
  run: <T>(context: ContextOptions, callback: () => T | Promise<T>) => {
    const parent = als.getStore() ?? {
      id: uuidv4(),
      user: {
        id: 0,
        email: null,
      },
      timezone: 'UTC',
      timestamp: Date.now(),
      data: undefined,
      request: undefined,
    };

    // preserve original context if .run() called multiple times
    const options = {
      ...parent,
      ...context,
      data: context.data ?? parent.data ?? {},
      id: context.id ?? parent.id ?? uuidv4(),
      timestamp: context.timestamp ?? parent.timestamp ?? Date.now(),
      request: context.request ?? parent.request ?? {},
      user: context.user ?? parent.user ?? {
        id: 0,
        email: null,
      },
    };

    return als.run(options, callback);
  },
  setUser(obj: { id: number, email: string }) {
    const store = als.getStore();
    if (store) {
      store.user = obj;
    }
  },
  get: <T>(key: string): T | undefined => {
    const store = als.getStore();
    return store?.data ? store?.data?.[key] : undefined;
  },
  // biome-ignore lint/suspicious/noExplicitAny: dynamic object
  set: (key: string, value: any) => {
    const store = als.getStore();
    if (!store) return;

    if (!store.data) {
      store.data = {};
    }

    store.data[key] = value;
  },
};
