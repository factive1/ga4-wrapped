import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignInButton } from "./sign-in-button"

export default async function SignInPage() {
  const session = await auth()

  if (session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <svg
              className="h-8 w-8"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width="32"
                height="32"
                rx="8"
                className="fill-primary"
              />
              <path
                d="M8 22L12 10L16 18L20 12L24 22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-2xl font-bold">Clearview</h1>
          </div>
          <p className="text-muted-foreground text-sm text-balance">
            Your GA4 data. A dashboard that doesn&apos;t suck.
          </p>
        </div>
        <SignInButton />
        <p className="text-muted-foreground text-center text-xs text-balance">
          Sign in with your Google account to access your GA4 properties.
          Your data stays between you and Google — nothing is stored.
        </p>
      </div>
    </div>
  )
}
