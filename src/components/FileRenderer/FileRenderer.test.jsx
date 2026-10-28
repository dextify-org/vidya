import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileRenderer from "./FileRenderer.jsx";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("FileRenderer HTML preview", () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it("renders fetched HTML in an opaque, restricted iframe", async () => {
    axios.get.mockResolvedValue({
      data: '<script>window.parent.document.body.textContent = "owned"</script>',
    });

    render(
      <FileRenderer
        fileType="html"
        fileSrc="/api/course/file/1"
        fileName="lesson.html"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Render HTML" }));

    const iframe = await screen.findByTitle("lesson.html preview");
    await waitFor(() => expect(axios.get).toHaveBeenCalledOnce());

    expect(iframe).toHaveAttribute("sandbox", "");
    expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(iframe.getAttribute("srcdoc")).toContain("script-src 'none'");
    expect(document.body.textContent).not.toContain("owned");
  });
});
