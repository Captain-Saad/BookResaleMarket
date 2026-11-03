import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookCover from "@/components/domain/book-cover";

const renderCover = () =>
  render(<BookCover coverId={123} title="Frankenstein" author="Mary Shelley" sizes="128px" />);

describe("BookCover", () => {
  it("names the cover once and shows the image over a title card", () => {
    renderCover();
    const cover = screen.getByRole("img", { name: "Cover of Frankenstein" });
    const image = cover.querySelector("img");
    expect(image).toHaveAttribute("src", expect.stringContaining("covers.openlibrary.org"));
    expect(image).toHaveAttribute("alt", "");
    expect(image).toBeVisible();
    expect(cover).toHaveTextContent("Mary Shelley");
  });

  it("hides a failed image so the title card shows, without React state", () => {
    renderCover();
    const cover = screen.getByRole("img", { name: "Cover of Frankenstein" });
    const image = cover.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);
    expect(image).not.toBeVisible();
    expect(screen.getByRole("img", { name: "Cover of Frankenstein" })).toHaveTextContent(
      "Frankenstein",
    );
  });
});
