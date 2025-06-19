import { Copy, FileDown, Edit, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionToolbarProps {
  showEditButton?: boolean;
  isEditable?: boolean;
  onToggleEdit?: () => void;
  onCopy: () => void;
  onExport: (format: "txt" | "pdf" | "docx") => void;
}

export const ActionToolbar = ({
  showEditButton = false,
  isEditable = false,
  onToggleEdit,
  onCopy,
  onExport,
}: ActionToolbarProps) => {
  return (
    <div className="flex items-center space-x-2">
      {showEditButton && onToggleEdit && (
        <Button
          variant={isEditable ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleEdit}
          className="flex items-center space-x-2"
        >
          {isEditable ? (
            <Lock className="h-4 w-4 mr-2" />
          ) : (
            <Edit className="h-4 w-4 mr-2" />
          )}
          <span>{isEditable ? "Lock" : "Edit"}</span>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="flex items-center space-x-2"
      >
        <Copy className="h-4 w-4 mr-2" />
        <span>Copy</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span>Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onExport("txt")}>
            as TXT
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("pdf")}>
            as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("docx")}>
            as DOCX
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
