import { setupServer } from "msw/node";
import { handlers } from "@/lib/api/mocks/handlers";
import { authMocks } from "./auth-mocks";

export const server = setupServer(...authMocks, ...handlers);
