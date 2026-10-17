import { setupServer } from "msw/node";
import { handlers } from "@/lib/api/mocks/handlers";

export const server = setupServer(...handlers);
