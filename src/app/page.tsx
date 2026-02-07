import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Header } from "@/components/layout";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-neutral-900 tracking-tight">
              Transform Your Videos Into{" "}
              <span className="text-primary-600">Print-Ready Books</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-neutral-600 leading-relaxed">
              Inkwell uses AI to turn your YouTube video library into professionally structured,
              beautifully formatted books ready for Amazon KDP.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg">Start Your Book</Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg">See How It Works</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-neutral-900">
              From Videos to Book in Minutes
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              Our AI-powered workflow handles everything from transcript extraction to final PDF
              generation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="default" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-primary-600"
                  >
                    <path d="m22 8-6 4 6 4V8Z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                  </svg>
                </div>
                <CardTitle>Connect YouTube</CardTitle>
                <CardDescription>
                  Link your YouTube channel and select the videos you want to transform.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="default" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-primary-600"
                  >
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="m2 14 6-6" />
                    <path d="M14 14h4" />
                    <path d="M14 18h4" />
                  </svg>
                </div>
                <CardTitle>AI Structures Your Book</CardTitle>
                <CardDescription>
                  Our AI analyzes your content, captures your voice, and proposes the perfect
                  structure.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="default" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-primary-600"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                  </svg>
                </div>
                <CardTitle>Export to KDP</CardTitle>
                <CardDescription>
                  Generate print-ready PDFs that meet Amazon KDP specifications. Ready to publish.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
              </div>
              <span className="font-heading font-medium text-neutral-900">Inkwell</span>
            </div>
            <p className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} Inkwell. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
