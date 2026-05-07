import { BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageOrderTab } from "./preview/PageOrderTab";
import { SheetTableTab } from "./preview/SheetTableTab";
import { BookViewTab } from "./preview/BookViewTab";
import type { BookletState } from "@/hooks/useBooklet";

interface Props {
  state: BookletState;
}

export function PreviewPanel({ state }: Props) {
  const { layout, sourcePages, pageCount } = state;

  if (!layout) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 text-muted-foreground h-full min-h-[300px]">
        <BookOpen className="size-16 opacity-30" />
        <p className="text-sm">
          Upload a PDF or paste text to see the booklet layout
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col h-full">
      <Tabs defaultValue="order" className="flex flex-col h-full">
        <TabsList className="shrink-0 w-full justify-start">
          <TabsTrigger value="order">Page Order</TabsTrigger>
          <TabsTrigger value="layout">Sheet Table</TabsTrigger>
          <TabsTrigger value="book">📖 Book View</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4">
          <TabsContent value="order" className="mt-0">
            <PageOrderTab
              layout={layout}
              sourcePages={sourcePages}
              pageCount={pageCount}
            />
          </TabsContent>
          <TabsContent value="layout" className="mt-0">
            <SheetTableTab layout={layout} />
          </TabsContent>
          <TabsContent value="book" className="mt-0">
            <BookViewTab
              pageCount={pageCount}
              direction={layout.direction}
              sourcePages={sourcePages}
            />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
