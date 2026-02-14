export const SUPERCHARGE_CSV_SCHEMA_VERSION = 'supercharge.v2';

export type SuperchargeCsvExportType = 'family_telemetry' | 'child_telemetry' | 'session_transcript';

type CsvColumnType = 'string' | 'number' | 'integer' | 'date' | 'enum';

interface CsvColumnRule {
    name: string;
    type: CsvColumnType;
    required?: boolean;
    enumValues?: readonly string[];
    min?: number;
    max?: number;
}

const ALLOWED_TOPICS = ['food', 'transport', 'shrines', 'school', 'phrases', 'culture', 'nature', 'general', 'none'] as const;

const EXPORT_SCHEMAS: Record<SuperchargeCsvExportType, CsvColumnRule[]> = {
    child_telemetry: [
        { name: 'child_name', type: 'string', required: true },
        { name: 'range_start', type: 'date', required: true },
        { name: 'range_end', type: 'date', required: true },
        { name: 'lessons', type: 'integer', required: true, min: 0 },
        { name: 'mini_quests', type: 'integer', required: true, min: 0 },
        { name: 'safety_mode', type: 'enum', required: true, enumValues: ['basic', 'strict'] },
        { name: 'topic', type: 'enum', required: true, enumValues: ALLOWED_TOPICS },
        { name: 'total', type: 'integer', required: true, min: 0 },
        { name: 'generated', type: 'integer', required: true, min: 0 },
        { name: 'remixed', type: 'integer', required: true, min: 0 },
        { name: 'shortage', type: 'integer', required: true, min: 0 }
    ],
    family_telemetry: [
        { name: 'child_name', type: 'string', required: true },
        { name: 'range_start', type: 'date', required: true },
        { name: 'range_end', type: 'date', required: true },
        { name: 'lessons', type: 'integer', required: true, min: 0 },
        { name: 'mini_quests', type: 'integer', required: true, min: 0 },
        { name: 'branch_diversity', type: 'integer', required: true, min: 0 },
        { name: 'top_branch', type: 'string', required: true },
        { name: 'topic', type: 'enum', required: true, enumValues: ALLOWED_TOPICS },
        { name: 'total', type: 'integer', required: true, min: 0 },
        { name: 'generated', type: 'integer', required: true, min: 0 },
        { name: 'remixed', type: 'integer', required: true, min: 0 },
        { name: 'shortage', type: 'integer', required: true, min: 0 },
        { name: 'adaptive_accuracy', type: 'number', required: true, min: 0, max: 100 },
        { name: 'adaptive_difficulty', type: 'number', required: true, min: 0, max: 3 },
        { name: 'adaptive_shift', type: 'number', required: true, min: -3, max: 3 },
        { name: 'adaptive_sessions', type: 'integer', required: true, min: 0 }
    ],
    session_transcript: [
        { name: 'child_name', type: 'string', required: true },
        { name: 'session_key', type: 'string', required: true },
        { name: 'date_key', type: 'date', required: true },
        { name: 'topic', type: 'enum', required: true, enumValues: ALLOWED_TOPICS.filter((topic) => topic !== 'none') },
        { name: 'question', type: 'string', required: true },
        { name: 'order', type: 'integer', required: true, min: 1 }
    ]
};

const isSuperchargeExportType = (value: string): value is SuperchargeCsvExportType => {
    return value === 'child_telemetry' || value === 'family_telemetry' || value === 'session_transcript';
};

const normalizeCell = (value: string) => value.trim();

const toDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const levenshteinDistance = (a: string, b: string) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    const matrix = Array.from({ length: left.length + 1 }, (_, rowIndex) => (
        Array.from({ length: right.length + 1 }, (_, columnIndex) => {
            if (rowIndex === 0) return columnIndex;
            if (columnIndex === 0) return rowIndex;
            return 0;
        })
    ));

    for (let rowIndex = 1; rowIndex <= left.length; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= right.length; columnIndex += 1) {
            const cost = left[rowIndex - 1] === right[columnIndex - 1] ? 0 : 1;
            matrix[rowIndex][columnIndex] = Math.min(
                matrix[rowIndex - 1][columnIndex] + 1,
                matrix[rowIndex][columnIndex - 1] + 1,
                matrix[rowIndex - 1][columnIndex - 1] + cost
            );
        }
    }

    return matrix[left.length][right.length];
};

const suggestClosestColumn = (value: string, candidates: string[]) => {
    const normalized = value.trim();
    if (!normalized) return null;

    let best: { column: string; distance: number } | null = null;
    for (const candidate of candidates) {
        const distance = levenshteinDistance(normalized, candidate);
        if (!best || distance < best.distance) {
            best = { column: candidate, distance };
        }
    }

    if (!best) return null;
    return best.distance <= 3 ? best.column : null;
};

const validateCell = (rule: CsvColumnRule, value: string): string | null => {
    const normalized = normalizeCell(value);
    if (!normalized) {
        return rule.required ? 'Value is required.' : null;
    }

    if (rule.type === 'string') return null;

    if (rule.type === 'date') {
        if (!toDateKey(normalized)) return 'Expected YYYY-MM-DD date.';
        const parsed = new Date(`${normalized}T00:00:00.000Z`).getTime();
        if (Number.isNaN(parsed)) return 'Expected a valid calendar date.';
        return null;
    }

    if (rule.type === 'enum') {
        if (!rule.enumValues || rule.enumValues.length === 0) return null;
        if (rule.enumValues.includes(normalized)) return null;
        return `Expected one of: ${rule.enumValues.join(', ')}.`;
    }

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return 'Expected a numeric value.';
    if (rule.type === 'integer' && !Number.isInteger(numeric)) return 'Expected an integer value.';
    if (rule.min != null && numeric < rule.min) return `Value must be >= ${rule.min}.`;
    if (rule.max != null && numeric > rule.max) return `Value must be <= ${rule.max}.`;
    return null;
};

export const parseCsvRows = (rawCsv: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    const pushRow = () => {
        const hasValue = row.some((value) => value.length > 0);
        if (hasValue || row.length > 1) {
            rows.push(row);
        }
        row = [];
    };

    for (let index = 0; index < rawCsv.length; index += 1) {
        const char = rawCsv[index];
        const nextChar = rawCsv[index + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                index += 1;
            }
            row.push(current);
            current = '';
            pushRow();
            continue;
        }

        current += char;
    }

    row.push(current);
    pushRow();
    return rows;
};

export const buildVersionedCsvHeader = (columns: string[]) => {
    return ['schema_version', 'export_type', ...columns].join(',');
};

export const buildVersionedCsvRow = (
    exportType: SuperchargeCsvExportType,
    values: Array<string | number>
) => {
    return [SUPERCHARGE_CSV_SCHEMA_VERSION, exportType, ...values].join(',');
};

export interface CsvSchemaPreview {
    valid: boolean;
    version: string | null;
    exportType: string | null;
    rowCount: number;
    columnCount: number;
    message: string;
    issues: Array<{
        severity: 'error' | 'warning';
        line: number;
        column: string;
        message: string;
        suggestion?: string;
    }>;
    suggestions: string[];
}

export interface CsvAutoFixResult {
    applied: boolean;
    exportType: SuperchargeCsvExportType | null;
    fixedCsv: string | null;
    message: string;
    changes: string[];
}

const escapeCsvCell = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

const toIsoDateSafe = (rawValue: string) => {
    const trimmed = normalizeCell(rawValue);
    if (!trimmed) return '';
    if (toDateKey(trimmed)) return trimmed;
    const parsedMs = new Date(trimmed).getTime();
    if (Number.isNaN(parsedMs)) return '';
    return new Date(parsedMs).toISOString().slice(0, 10);
};

const normalizeCellForRule = (rule: CsvColumnRule, rawValue: string) => {
    const trimmed = normalizeCell(rawValue);

    if (rule.type === 'string') return trimmed;

    if (rule.type === 'date') return toIsoDateSafe(trimmed);

    if (rule.type === 'enum') {
        const allowed = rule.enumValues || [];
        if (allowed.includes(trimmed)) return trimmed;
        return allowed[0] || '';
    }

    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
        return rule.type === 'integer' ? '0' : '0';
    }

    const clampedMin = rule.min != null ? Math.max(numeric, rule.min) : numeric;
    const clamped = rule.max != null ? Math.min(clampedMin, rule.max) : clampedMin;

    if (rule.type === 'integer') {
        return String(Math.round(clamped));
    }

    return String(Number(clamped.toFixed(4)));
};

const defaultValueForRule = (rule: CsvColumnRule) => {
    if (rule.type === 'string') {
        if (rule.name === 'child_name') return 'Unknown Child';
        if (rule.name === 'session_key') return 'session-unknown';
        if (rule.name === 'question') return 'Practice prompt';
        if (rule.name === 'top_branch') return 'General';
        return '';
    }

    if (rule.type === 'date') {
        return new Date().toISOString().slice(0, 10);
    }

    if (rule.type === 'enum') {
        if (rule.name === 'topic') return rule.enumValues?.includes('general') ? 'general' : (rule.enumValues?.[0] || '');
        if (rule.name === 'safety_mode') return 'basic';
        return rule.enumValues?.[0] || '';
    }

    return '0';
};

const detectExportType = (header: string[], firstDataRow: string[]): SuperchargeCsvExportType | null => {
    const typeIndex = header.indexOf('export_type');
    const fromRow = typeIndex >= 0 ? normalizeCell(firstDataRow[typeIndex] || '') : '';
    if (isSuperchargeExportType(fromRow)) return fromRow;

    const candidates = (Object.keys(EXPORT_SCHEMAS) as SuperchargeCsvExportType[]).map((exportType) => {
        const schemaColumns = EXPORT_SCHEMAS[exportType].map((rule) => rule.name);
        const score = schemaColumns.reduce((sum, column) => sum + (header.includes(column) ? 1 : 0), 0);
        return { exportType, score };
    }).sort((a, b) => b.score - a.score);

    if (candidates.length === 0 || candidates[0].score === 0) return null;
    return candidates[0].exportType;
};

export const autoFixCsvSchema = (rawCsv: string): CsvAutoFixResult => {
    if (!rawCsv.trim()) {
        return {
            applied: false,
            exportType: null,
            fixedCsv: null,
            message: 'CSV is empty.',
            changes: []
        };
    }

    const parsedRows = parseCsvRows(rawCsv);
    const rows = parsedRows.filter((row) => row.some((cell) => cell.trim().length > 0));
    if (rows.length < 2) {
        return {
            applied: false,
            exportType: null,
            fixedCsv: null,
            message: 'CSV needs a header and at least one data row.',
            changes: []
        };
    }

    const header = rows[0].map((cell) => normalizeCell(cell));
    const firstDataRow = rows[1] || [];
    const exportType = detectExportType(header, firstDataRow);
    if (!exportType) {
        return {
            applied: false,
            exportType: null,
            fixedCsv: null,
            message: 'Unable to detect export_type for auto-fix.',
            changes: []
        };
    }

    const schema = EXPORT_SCHEMAS[exportType];
    const desiredHeader = ['schema_version', 'export_type', ...schema.map((rule) => rule.name)];
    const headerIndex = new Map(header.map((column, index) => [column, index]));
    const resolvedColumnIndex = new Map<string, number | null>();
    const changes: string[] = [];

    schema.forEach((rule) => {
        if (headerIndex.has(rule.name)) {
            resolvedColumnIndex.set(rule.name, headerIndex.get(rule.name) ?? null);
            return;
        }

        const suggestion = suggestClosestColumn(rule.name, header);
        if (suggestion && headerIndex.has(suggestion)) {
            resolvedColumnIndex.set(rule.name, headerIndex.get(suggestion) ?? null);
            changes.push(`Mapped column "${suggestion}" -> "${rule.name}".`);
            return;
        }

        resolvedColumnIndex.set(rule.name, null);
        changes.push(`Added missing column "${rule.name}" with safe defaults.`);
    });

    const fixedRows = rows.slice(1).map((row) => {
        const line: string[] = [];
        line.push(SUPERCHARGE_CSV_SCHEMA_VERSION);
        line.push(exportType);

        schema.forEach((rule) => {
            const sourceIndex = resolvedColumnIndex.get(rule.name);
            const sourceValue = sourceIndex != null ? (row[sourceIndex] || '') : '';
            const normalized = normalizeCellForRule(rule, sourceValue);
            const value = normalized || defaultValueForRule(rule);
            line.push(value);
        });

        return line;
    });

    const fixedCsv = [
        desiredHeader.map(escapeCsvCell).join(','),
        ...fixedRows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    ].join('\n');

    if (changes.length === 0 && rawCsv.trim() === fixedCsv.trim()) {
        return {
            applied: false,
            exportType,
            fixedCsv,
            message: 'CSV already matches expected schema; no auto-fix needed.',
            changes: []
        };
    }

    return {
        applied: true,
        exportType,
        fixedCsv,
        message: `Generated normalized ${exportType} CSV with ${changes.length} structural changes.`,
        changes: changes.slice(0, 20)
    };
};

export const inspectCsvSchema = (rawCsv: string): CsvSchemaPreview => {
    const issues: CsvSchemaPreview['issues'] = [];

    if (!rawCsv.trim()) {
        return {
            valid: false,
            version: null,
            exportType: null,
            rowCount: 0,
            columnCount: 0,
            message: 'Empty CSV.',
            issues: [],
            suggestions: ['Export a fresh CSV from Parent Admin and import that file.']
        };
    }

    const parsedRows = parseCsvRows(rawCsv);
    const rows = parsedRows.filter((row) => row.some((cell) => cell.trim().length > 0));

    if (rows.length < 2) {
        return {
            valid: false,
            version: null,
            exportType: null,
            rowCount: 0,
            columnCount: 0,
            message: 'CSV needs a header and at least one data row.',
            issues: [],
            suggestions: ['Include one header row and at least one data row.']
        };
    }

    const header = rows[0].map((value) => value.trim());
    const schemaIndex = header.indexOf('schema_version');
    const typeIndex = header.indexOf('export_type');
    if (schemaIndex === -1 || typeIndex === -1) {
        issues.push({
            severity: 'error',
            line: 1,
            column: schemaIndex === -1 ? 'schema_version' : 'export_type',
            message: 'Required metadata columns are missing.',
            suggestion: 'Include schema_version and export_type as the first header columns.'
        });
        return {
            valid: false,
            version: null,
            exportType: null,
            rowCount: 0,
            columnCount: header.length,
            message: 'Missing schema_version or export_type columns.',
            issues,
            suggestions: ['Include schema_version and export_type columns in the header.']
        };
    }

    const firstData = rows[1];
    const version = firstData[schemaIndex] || null;
    const exportType = firstData[typeIndex] || null;
    const dataRowCount = rows.length - 1;
    const expectedColumns = [header[schemaIndex], header[typeIndex], ...Object.values(EXPORT_SCHEMAS).flat().map((rule) => rule.name)];

    const collectedSuggestions = new Set<string>();
    if (version !== SUPERCHARGE_CSV_SCHEMA_VERSION) {
        issues.push({
            severity: 'error',
            line: 2,
            column: 'schema_version',
            message: `Unsupported schema version: ${version || 'missing'}.`,
            suggestion: `Use ${SUPERCHARGE_CSV_SCHEMA_VERSION}.`
        });
        collectedSuggestions.add(`Re-export CSV from Parent Admin to set schema_version=${SUPERCHARGE_CSV_SCHEMA_VERSION}.`);
    }

    if (!exportType || !isSuperchargeExportType(exportType)) {
        issues.push({
            severity: 'error',
            line: 2,
            column: 'export_type',
            message: `Unknown export_type: ${exportType || 'missing'}.`,
            suggestion: `Use one of: child_telemetry, family_telemetry, session_transcript.`
        });
    }

    const schema = exportType && isSuperchargeExportType(exportType)
        ? EXPORT_SCHEMAS[exportType]
        : null;

    if (schema) {
        const schemaColumns = schema.map((rule) => rule.name);
        schema.forEach((rule) => {
            if (!header.includes(rule.name)) {
                issues.push({
                    severity: 'error',
                    line: 1,
                    column: rule.name,
                    message: 'Required column is missing.',
                    suggestion: `Add column "${rule.name}".`
                });
            }
        });

        header.forEach((column) => {
            if (column === 'schema_version' || column === 'export_type') return;
            if (!schemaColumns.includes(column)) {
                const suggestion = suggestClosestColumn(column, schemaColumns);
                issues.push({
                    severity: 'warning',
                    line: 1,
                    column,
                    message: 'Column is not expected for this export type.',
                    suggestion: suggestion ? `Did you mean "${suggestion}"?` : 'Remove this extra column or export a fresh CSV.'
                });
                if (suggestion) {
                    collectedSuggestions.add(`Rename "${column}" to "${suggestion}".`);
                }
            }
        });

        const headerIndex = new Map(header.map((value, index) => [value, index]));

        rows.slice(1).forEach((row, rowOffset) => {
            const line = rowOffset + 2;
            if (row.length !== header.length) {
                issues.push({
                    severity: 'warning',
                    line,
                    column: '*',
                    message: `Row has ${row.length} cells but header has ${header.length}.`,
                    suggestion: 'Check for unescaped commas or missing values in quoted text.'
                });
            }

            const rowVersion = normalizeCell(row[schemaIndex] || '');
            const rowExportType = normalizeCell(row[typeIndex] || '');
            if (rowVersion !== SUPERCHARGE_CSV_SCHEMA_VERSION) {
                issues.push({
                    severity: 'error',
                    line,
                    column: 'schema_version',
                    message: `Expected ${SUPERCHARGE_CSV_SCHEMA_VERSION} but found ${rowVersion || 'missing'}.`,
                    suggestion: `Set schema_version to ${SUPERCHARGE_CSV_SCHEMA_VERSION}.`
                });
            }
            if (rowExportType !== exportType) {
                issues.push({
                    severity: 'error',
                    line,
                    column: 'export_type',
                    message: `Mixed export types found (${rowExportType || 'missing'}).`,
                    suggestion: `Keep all rows as ${exportType}.`
                });
            }

            schema.forEach((rule) => {
                const index = headerIndex.get(rule.name);
                if (index == null) return;
                const cellValue = row[index] ?? '';
                const error = validateCell(rule, cellValue);
                if (!error) return;
                issues.push({
                    severity: 'error',
                    line,
                    column: rule.name,
                    message: error,
                    suggestion: `Fix "${rule.name}" on line ${line}.`
                });
            });
        });
    } else {
        const unknownColumns = header.filter((column) => column !== 'schema_version' && column !== 'export_type');
        unknownColumns.forEach((column) => {
            const suggestion = suggestClosestColumn(column, expectedColumns);
            if (suggestion && suggestion !== column) {
                collectedSuggestions.add(`Rename "${column}" to "${suggestion}".`);
            }
        });
    }

    const errorCount = issues.filter((issue) => issue.severity === 'error').length;
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
    const valid = errorCount === 0;
    const suggestions = Array.from(collectedSuggestions).slice(0, 6);
    const message = valid
        ? `Parsed ${dataRowCount} rows (${exportType || 'unknown export type'}) with ${warningCount} warning${warningCount === 1 ? '' : 's'}.`
        : `Found ${errorCount} error${errorCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'}.`;

    return {
        valid,
        version,
        exportType,
        rowCount: dataRowCount,
        columnCount: header.length,
        message,
        issues: issues.slice(0, 40),
        suggestions
    };
};
