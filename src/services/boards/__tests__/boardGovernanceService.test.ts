import { TextEncoder } from "util";
import { enqueueFrom, resetSupabaseMocks, supabaseMock, utilsMocks } from "@/testing/supabaseHarness";
import { createBoardShareLink, setItemPrivacy } from "@/services/boards/boardGovernanceService";

describe("board governance service", () => {
  const originalCrypto = globalThis.crypto;
  const originalTextEncoder = (globalThis as any).TextEncoder;

  beforeAll(() => {
    (globalThis as any).TextEncoder = TextEncoder;
  });

  beforeEach(() => {
    resetSupabaseMocks();
    utilsMocks.requireUserIdMock.mockResolvedValue("user-123");
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    Object.defineProperty(globalThis, "crypto", {
      value: {
        subtle: {
          digest: jest.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]).buffer),
        },
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(globalThis, "crypto", {
        value: originalCrypto,
        configurable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as any).crypto;
    }
  });

  afterAll(() => {
    if (originalTextEncoder) {
      (globalThis as any).TextEncoder = originalTextEncoder;
    } else {
      delete (globalThis as any).TextEncoder;
    }
  });

  it("creates share links with hashed passwords and audit-ready payloads", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    enqueueFrom("board_share_links", { insert });

    await createBoardShareLink("board-1", {
      allowedRole: "manager",
      password: "secret",
      expiresAt: null,
      maxUses: 10,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith("board_share_links");
    expect(utilsMocks.requireUserIdMock).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
    const payload = insert.mock.calls[0][0];
    expect(payload.board_id).toBe("board-1");
    expect(payload.allowed_role).toBe("manager");
    expect(payload.password_hash).toBe("00010203");
    expect(payload.slug).toMatch(/^[a-z0-9]{6,8}$/);
    expect(payload.max_uses).toBe(10);
  });

  it("records the acting user when setting item privacy", async () => {
    utilsMocks.requireUserIdMock.mockResolvedValue("actor-1");
    const upsert = jest.fn().mockResolvedValue({ error: null });
    enqueueFrom("board_item_privacy", { upsert });

    await setItemPrivacy({
      boardId: "board-1",
      itemId: "task-1",
      visibility: "manager",
      reason: "Contains roadmap",
    });

    expect(utilsMocks.requireUserIdMock).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        board_id: "board-1",
        item_id: "task-1",
        created_by: "actor-1",
        visibility: "manager",
      }),
      { onConflict: "board_id,item_id" }
    );
  });
});
