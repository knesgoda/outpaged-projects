import type { ComponentProps } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { QueryBuilder } from "../QueryBuilder";
import {
  collectQueryParameters,
  opqlToQuery,
  queryToOpql,
} from "@/lib/opql/builder";
import { NaturalLanguageSession } from "@/lib/opql/naturalLanguage";

describe("QueryBuilder", () => {
  const renderBuilder = (opql: string, overrides: Partial<ComponentProps<typeof QueryBuilder>> = {}) => {
    const query = opqlToQuery(opql);
    const onChange = jest.fn();
    const onOpqlChange = jest.fn();
    const utils = render(
      <QueryBuilder
        value={query}
        opqlText={queryToOpql(query)}
        onChange={onChange}
        onOpqlChange={onOpqlChange}
        naturalLanguage={new NaturalLanguageSession()}
        {...overrides}
      />
    );
    return { onChange, onOpqlChange, container: utils.container };
  };

  it("renders projections and propagates limit changes", () => {
    const { onChange } = renderBuilder(
      "FIND * FROM ITEMS WHERE status = 'open' ORDER BY updated_at DESC LIMIT 5"
    );
    const limitInput = screen.getByLabelText(/limit/i);
    fireEvent.change(limitInput, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].limit).toBe("10");
  });

  it("exposes parameter chips for referenced parameters", () => {
    const query = opqlToQuery("FIND * FROM ITEMS WHERE status = :status AND updated_at >= :start");
    expect(collectQueryParameters(query)).toEqual(expect.arrayContaining([":status", ":start"]));
    render(
      <QueryBuilder
        value={query}
        opqlText={queryToOpql(query)}
        onChange={jest.fn()}
        onOpqlChange={jest.fn()}
        naturalLanguage={new NaturalLanguageSession()}
      />
    );
    const chipContainer = screen.getByTestId("parameter-chip-container");
    expect(within(chipContainer).getByLabelText("parameter-:status")).toBeInTheDocument();
    expect(within(chipContainer).getByLabelText("parameter-:start")).toBeInTheDocument();
  });

  it("renders aggregation controls for aggregate statements", () => {
    renderBuilder("AGGREGATE COUNT(*) AS total FROM ITEMS GROUP BY assignee HAVING COUNT(*) > 2");
    expect(screen.getByText(/aggregations/i)).toBeInTheDocument();
    expect(screen.getByText(/add grouping/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Having$/i).length).toBeGreaterThan(0);
  });
});
