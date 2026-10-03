"use client";


import { useEffect, useState } from "react";
import { useAwsConfig } from "@/lib/state";
import { testApiConnection } from "@/lib/aws";
import { Button, Field, Modal, TextInput } from "./fields";

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config, setConfig, clearConfig } = useAwsConfig();
  const [apiUrl, setApiUrl] = useState(config?.apiUrl ?? "");
  const [apiKey, setApiKey] = useState(config?.apiKey ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setApiUrl(config?.apiUrl ?? "");
      setApiKey(config?.apiKey ?? "");
      setStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    if (!apiUrl.trim() || !apiKey.trim()) {
      setStatus("Both the API URL and the API key are required.");
      return;
    }
    setConfig({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
    setStatus("Saved to this browser's local storage.");
  }

  async function test() {
    setTesting(true);
    setStatus("Testing connection...");
    try {
      await testApiConnection({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
      setStatus("Connection OK: the gateway accepted the URL and API key.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Connection failed: ${message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="AWS / S3 settings">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          These credentials let the editor request presigned URLs from the API Gateway deployed by
          the Kynetic CDK stack, so SVG assets can be uploaded to and fetched from your S3 bucket.
          This is optional. Projects without S3 assets work without it.
        </p>

        <Field
          label="API Gateway URL"
          hint="Paste the API URL from the CDK output, e.g. https://xxxx.execute-api.eu-west-1.amazonaws.com/prod/"
        >
          <TextInput value={apiUrl} onChange={setApiUrl} mono placeholder="https://...amazonaws.com/prod/" />
        </Field>

        <Field
          label="API key"
          hint="The value of the API key created by the stack (aws apigateway get-api-key --include-value)"
        >
          <TextInput value={apiKey} onChange={setApiKey} type="password" mono />
        </Field>

        {status ? (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {status}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={save}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => void test()} disabled={testing}>
            {testing ? "Testing..." : "Test connection"}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              clearConfig();
              setApiUrl("");
              setApiKey("");
              setStatus("Cleared.");
            }}
          >
            Clear saved credentials
          </Button>
        </div>
      </div>
    </Modal>
  );
}
