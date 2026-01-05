export const getFileIcon = (filename?: string) => {
    if (!filename) return "description";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "pdf":
            return "picture_as_pdf";
        case "xls":
        case "xlsx":
        case "csv":
            return "table_view";
        case "ppt":
        case "pptx":
            return "slideshow";
        case "doc":
        case "docx":
        case "hwp":
            return "article";
        case "zip":
        case "rar":
        case "7z":
            return "folder_zip";
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "svg":
            return "image";
        case "txt":
        case "md":
            return "text_snippet";
        case "json":
        case "xml":
        case "html":
        case "css":
        case "js":
        case "ts":
            return "code";
        default:
            return "insert_drive_file";
    }
};

export const getFileIconColor = (filename?: string) => {
    if (!filename) return "text-gray-400";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "pdf":
            return "text-red-500";
        case "xls":
        case "xlsx":
        case "csv":
            return "text-green-600";
        case "ppt":
        case "pptx":
            return "text-orange-500";
        case "doc":
        case "docx":
        case "hwp":
            return "text-blue-600";
        case "zip":
        case "rar":
        case "7z":
            return "text-yellow-600";
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "svg":
            return "text-purple-500";
        case "txt":
        case "md":
            return "text-gray-600";
        case "json":
        case "xml":
        case "html":
        case "css":
        case "js":
        case "ts":
            return "text-indigo-500";
        default:
            return "text-gray-400";
    }
};
