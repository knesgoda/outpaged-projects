import { fireEvent, render, waitFor } from "@testing-library/react";
import { MarkdownEditor } from "../MarkdownEditor";

jest.mock("@/services/storage", () => ({
  uploadDocImage: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { uploadDocImage } = jest.requireMock("@/services/storage");

describe("MarkdownEditor", () => {
  it("uploads an image and inserts markdown", async () => {
    const handleChange = jest.fn();
    (uploadDocImage as jest.Mock).mockResolvedValue({ publicUrl: "https://cdn/docs/img.png" });

    const { container } = render(<MarkdownEditor value="" onChange={handleChange} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "diagram.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadDocImage).toHaveBeenCalledWith(file, "user-1");
      expect(handleChange).toHaveBeenCalledWith("![diagram.png](https://cdn/docs/img.png)");
    });
  });
});
