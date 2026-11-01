export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
