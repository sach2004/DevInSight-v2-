import Head from 'next/head';

export default function Layout({ children, title = 'DevInsight' }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFDF8]">
      <Head>
        <title>{title}</title>
        <meta name="description" content="A read-only codebase assistant for GitHub repositories" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className=" flex justify-center border-b-4 border-black items-center bg-[#FFFDF8]">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-5xl text-center font-bold">
            Dev<span className="text-blue-600">Insight</span>
          </h1>
        </div>
      </header>

  
      <main className="container mx-auto px-4 py-6 flex-grow">
        {children}
      </main>

      <footer className="bg-[#FFFDF8] shadow-inner border-t border-black">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-600 text-sm">
            Built with Next.js and Tailwind CSS. Uses Hugging Face for embeddings and Groq for LLM.
          </p>
        </div>
      </footer>
    </div>
  );
}
