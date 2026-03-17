import { auth } from "@/auth";

const publicPaths = ["/", "/signin", "/signup"];
const authApiPrefix = "/api/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (publicPaths.some((p) => p === pathname || pathname.startsWith(p + "/"))) {
    if (pathname === "/signin" || pathname === "/signup") {
      if (isLoggedIn) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return Response.redirect(url);
      }
    }
    return;
  }

  if (pathname.startsWith(authApiPrefix)) return;

  if (pathname.startsWith("/api/approval")) return;

  if (!isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
