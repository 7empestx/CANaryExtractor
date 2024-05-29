import React from "react";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Box from "@cloudscape-design/components/box";
import { isVisualRefresh } from "./../../common/apply-mode";
import { WidgetConfig } from "../interfaces";
import Table from "@cloudscape-design/components/table";
import { useState, useEffect } from "react";
import body from "../../../../config/body.json";
import TextFilter from "@cloudscape-design/components/text-filter";
import Pagination from "@cloudscape-design/components/pagination";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";

export const trendingCoins: WidgetConfig = {
  definition: { defaultRowSpan: 3, defaultColumnSpan: 2 },
  data: {
    icon: "table",
    title: "TrendingCoins",
    description: "Trending Coins",
    disableContentPaddings: !isVisualRefresh,
    header: TrendingCoinsHeader,
    content: TrendingCoins,
    footer: TrendingCoinsFooter,
  },
};

function TrendingCoinsHeader() {
  return <Header>Trending Coins</Header>;
}

function TrendingCoinsFooter() {
  return (
    <>
    </>
  );
}

export default function TrendingCoins() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://api.trendbit.grantstarkman.com/get-trending-coins",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();
        setCoins(data.coins);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter coins based on the filterText
  const filteredCoins = coins.filter((coin) =>
    coin.name.toLowerCase().includes(filterText.toLowerCase()),
  );

  console.log("filteredCoins", filteredCoins);

  return (
    <Table
      items={filteredCoins}
      sortingDescending
      columnDefinitions={[
        {
          id: "name",
          header: "Name",
          sortingField: "name",
          cell: (item) => item.name,
        },
        { id: "symbol", header: "Symbol", cell: (item) => item.symbol },
        {
          id: "marketCapRank",
          header: "Market Cap Rank",
          cell: (item) => item.marketCapRank,
        },
        { id: "count", header: "Count", cell: (item) => item.count },
      ]}
      trackBy="id"
      loadingText="Loading coins..."
      loading={loading}
      empty={
        <Box textAlign="center" padding="s">
          No coins found.
        </Box>
      }
      filter={
        <TextFilter
          filteringPlaceholder="Search coins"
          filteringText={filterText}
          onChange={({ detail }) => setFilterText(detail.filteringText)}
        />
      }
      header={
        <Header
          counter={
            selectedItems.length ? `(${selectedItems.length} selected)` : ""
          }
        ></Header>
      }
    />
  );
}
