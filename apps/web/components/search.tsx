'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Factory,
  Hammer,
  LayoutGrid,
  MapPin,
  Search,
  ShoppingBag,
  Tags,
  Users,
  Utensils,
} from 'lucide-react';
import { categories, municipalities } from '@leek/contracts';
import { Dropdown, type DropdownItem } from '@leek/ui/dropdown';
import styles from './search.module.css';

export type SearchFormProps = {
  q?: string;
  category?: string;
  municipality?: string;
  action?: string;
  /** Submit button content. */
  title?: string;
  icon?: ReactNode;
};

const categoryIcons: Record<string, ReactNode> = {
  Ehitus: <Hammer size={19} />,
  'Toitlustus ja majutus': <Utensils size={19} />,
  Teenused: <Users size={19} />,
  Tootmine: <Factory size={19} />,
  'Jaemüük': <ShoppingBag size={19} />,
};

export function SearchForm({
  q = '',
  category = '',
  municipality = '',
  action = '/ettevotted',
  title = 'Otsi ettevõtteid',
  icon = <ArrowRight size={18} />,
}: SearchFormProps) {
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedMunicipality, setSelectedMunicipality] = useState(municipality);

  // Keep filters in sync if the parent receives new URL search parameters.
  useEffect(() => { setSelectedCategory(category); }, [category]);
  useEffect(() => { setSelectedMunicipality(municipality); }, [municipality]);

  const categoryItems: DropdownItem[] = [
    {
      id: '',
      title: 'Kõik tegevusalad',
      icon: <LayoutGrid size={19} />,
      action: () => setSelectedCategory(''),
    },
    ...categories.map(value => ({
      id: value,
      title: value,
      icon: categoryIcons[value] ?? <Tags size={19} />,
      action: () => setSelectedCategory(value),
    })),
  ];
  const municipalityItems: DropdownItem[] = [
    {
      id: '',
      title: 'Kõik omavalitsused',
      icon: <LayoutGrid size={19} />,
      action: () => setSelectedMunicipality(''),
    },
    ...municipalities.map(value => ({
      id: value,
      title: value,
      icon: <MapPin size={19} />,
      action: () => setSelectedMunicipality(value),
    })),
  ];

  return (
    <form
      action={action}
      method="get"
      className={styles.form}
      role="search"
      aria-label="Ettevõtete otsing"
      onReset={() => {
        setSelectedCategory(category);
        setSelectedMunicipality(municipality);
      }}
    >
      <label className={styles.keyword}>
        <Search className={styles.keywordIcon} size={21} aria-hidden="true" />
        <span className={styles.keywordCopy}>
          <span className={styles.label}>Märksõna</span>
          <input
            key={q}
            className={styles.input}
            name="q"
            type="search"
            placeholder="Ettevõte või teenus"
            defaultValue={q}
            maxLength={120}
          />
        </span>
      </label>

      <input type="hidden" name="category" value={selectedCategory} />
      <Dropdown
        label="Tegevusala"
        title={selectedCategory || 'Kõik tegevusalad'}
        icon={<Tags size={20} />}
        items={categoryItems}
        selectedId={selectedCategory}
        searchable
        searchPlaceholder="Otsi tegevusala..."
        footer="Vali sobiv tegevusala"
      />

      <input type="hidden" name="municipality" value={selectedMunicipality} />
      <Dropdown
        label="Asukoht"
        title={selectedMunicipality || 'Kõik omavalitsused'}
        icon={<MapPin size={20} />}
        items={municipalityItems}
        selectedId={selectedMunicipality}
        searchable
        searchPlaceholder="Otsi omavalitsust..."
        footer="Leia ettevõtted oma kodukandist"
      />

      <button className={styles.submit} type="submit">
        {title}
        <span aria-hidden="true">{icon}</span>
      </button>
    </form>
  );
}
