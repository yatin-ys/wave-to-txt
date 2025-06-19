import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  section: {
    marginBottom: 10,
  },
  text: {
    fontSize: 11,
  },
});

interface SummaryPDFProps {
  summary: string;
}

export const SummaryPDF = ({ summary }: SummaryPDFProps) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.text}>{summary}</Text>
      </View>
    </Page>
  </Document>
);
