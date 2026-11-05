import { setupServer } from "msw/node";
import { handlers } from "@/lib/api/mocks/handlers";
import { accountMocks, authMocks } from "./mock-api";

export const server = setupServer(...authMocks, ...accountMocks, ...handlers);
