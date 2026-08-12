import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { api } from "@/services/api";

const TYPE_LABEL = { G: "Government", NG: "Non-Government", "G-A": "Government Autonomous" };

let cached = null;

/** Official 158-college master list, grouped by district. */
export const useCollegeMaster = () => {
  const [colleges, setColleges] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    api
      .collegeMaster({ limit: 300 })
      .then((d) => {
        cached = d.items;
        setColleges(d.items);
      })
      .catch(() => setColleges([]))
      .finally(() => setLoading(false));
  }, []);

  return { colleges, loading };
};

export const CollegeSelect = ({ id = "college-select", value, onChange, error, required, hint }) => {
  const { colleges, loading } = useCollegeMaster();

  const options = colleges.map((c) => ({
    value: c.college_code,
    label: c.college_name,
    group: c.district,
    meta: TYPE_LABEL[c.college_type] || c.college_type,
  }));

  return (
    <SearchableSelect
      id={id}
      label="College / महाविद्यालय"
      value={value}
      onChange={(code) => onChange(code)}
      options={options}
      loading={loading}
      required={required}
      error={error}
      hint={hint || "Search by college name or code — 158 affiliated colleges"}
      placeholder="Select your college"
    />
  );
};
