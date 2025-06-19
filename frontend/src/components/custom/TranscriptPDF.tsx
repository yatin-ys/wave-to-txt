import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import type { JSONContent } from "@tiptap/react";
import type { Style } from "@react-pdf/types";

// Register fonts
// Using the default "Helvetica" as an example. For custom fonts, you would need to load the font files.
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: 'path/to/Roboto-Regular.ttf' },
//     { src: 'path/to/Roboto-Bold.ttf', fontWeight: 'bold' },
//     { src: 'path/to/Roboto-Italic.ttf', fontStyle: 'italic' },
//   ],
// });

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 65,
    lineHeight: 1.5,
  },
  paragraph: {
    marginBottom: 10,
  },
  text: {
    //
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  italic: {
    fontFamily: "Helvetica-Oblique",
  },
  strike: {
    textDecoration: "line-through",
  },
});

interface TranscriptPDFProps {
  content: JSONContent;
}

const renderNode = (
  node: JSONContent,
  index: number
): React.ReactElement | null => {
  if (node.type === "paragraph") {
    return (
      <View key={index} style={styles.paragraph}>
        {node.content?.map((contentNode, contentIndex) =>
          renderNode(contentNode, contentIndex)
        )}
      </View>
    );
  }

  if (node.type === "text" && node.text) {
    let style: Style = styles.text;
    if (node.marks) {
      const markStyles = node.marks.map((mark) => {
        if (mark.type === "bold") return styles.bold;
        if (mark.type === "italic") return styles.italic;
        if (mark.type === "strike") return styles.strike;
        return {};
      });
      style = Object.assign({}, style, ...markStyles);
    }
    return (
      <Text key={index} style={style}>
        {node.text}
      </Text>
    );
  }

  return null;
};

export const TranscriptPDF = ({ content }: TranscriptPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {content?.content?.map((node, index) => renderNode(node, index))}
    </Page>
  </Document>
);
