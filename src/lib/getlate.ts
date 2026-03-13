import Late from "@getlatedev/node";

export function createGetLateClient(apiKey: string) {
  return new Late({ apiKey });
}

