import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-4xl font-bold">404</p>
          <div className="text-center">
            <p className="font-medium">Page not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              The page you are looking for does not exist.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
          >
            Go to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
